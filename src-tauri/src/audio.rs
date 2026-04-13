use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hound::{WavSpec, WavWriter};
use std::collections::VecDeque;
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;

// cpal::Stream is not Sync on Windows (WASAPI), wrap it to allow static storage
struct StreamWrapper(cpal::Stream);
unsafe impl Sync for StreamWrapper {}
unsafe impl Send for StreamWrapper {}

#[derive(Clone)]
struct RecordingMeta {
    sample_rate: u32,
    channels: u16,
}

static IS_RECORDING: AtomicBool = AtomicBool::new(false);
static RING_BUFFER: Mutex<Option<Arc<Mutex<VecDeque<f32>>>>> = Mutex::new(None);
static RECORDING_SAMPLES: Mutex<Option<Arc<Mutex<Vec<f32>>>>> = Mutex::new(None);
static RECORDING_STREAM: Mutex<Option<StreamWrapper>> = Mutex::new(None);
static RECORDING_META: Mutex<Option<RecordingMeta>> = Mutex::new(None);

#[tauri::command]
pub fn get_microphones() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let devices = host.input_devices().map_err(|e| format!("Failed to get input devices: {e}"))?;
    let mut names = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            names.push(name);
        }
    }
    Ok(names)
}

#[tauri::command]
pub fn init_audio_stream(app: tauri::AppHandle, device_name: Option<String>) -> Result<(), String> {
    if RECORDING_STREAM.lock().unwrap().is_some() {
        return Ok(()); // Already running
    }

    let host = cpal::default_host();
    let device = if let Some(name) = device_name {
        let mut devices = host.input_devices().map_err(|e| format!("Failed to get input devices: {e}"))?;
        devices.find(|d| d.name().ok().as_ref() == Some(&name))
            .ok_or_else(|| format!("Microphone '{}' not found", name))?
    } else {
        host.default_input_device()
            .ok_or_else(|| "No microphone found. Check your mic is connected and not muted.".to_string())?
    };

    // Use whatever format the device actually supports
    let supported = device
        .default_input_config()
        .map_err(|e| format!("Could not get mic config: {e}"))?;

    let channels = supported.channels();
    let sample_rate = supported.sample_rate().0;
    let stream_config = supported.config();

    // 100ms buffer requested by user
    let buffer_ms = 100;
    let max_samples = (sample_rate as usize * channels as usize * buffer_ms) / 1000;

    let ring_buffer = Arc::new(Mutex::new(VecDeque::<f32>::with_capacity(max_samples)));
    *RING_BUFFER.lock().unwrap() = Some(Arc::clone(&ring_buffer));
    
    let active_samples = Arc::new(Mutex::new(Vec::<f32>::new()));
    *RECORDING_SAMPLES.lock().unwrap() = Some(Arc::clone(&active_samples));

    *RECORDING_META.lock().unwrap() = Some(RecordingMeta { sample_rate, channels });

    let mut last_emit = Instant::now();

    // Request f32
    let stream = device
        .build_input_stream(
            &stream_config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if IS_RECORDING.load(Ordering::Relaxed) {
                    if let Ok(mut active) = active_samples.lock() {
                        active.extend_from_slice(data);
                    }
                    if last_emit.elapsed() > Duration::from_millis(50) {
                        let max_amplitude = data.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
                        let _ = app.emit("audio-amplitude", max_amplitude);
                        last_emit = Instant::now();
                    }
                } else {
                    if let Ok(mut ring) = ring_buffer.lock() {
                        ring.extend(data.iter().copied());
                        // maintain 100ms size limit safely
                        let over = ring.len().saturating_sub(max_samples);
                        if over > 0 {
                            ring.drain(..over);
                        }
                    }
                }
            },
            |err| eprintln!("[audio] stream error: {err}"),
            None,
        )
        .map_err(|e| format!("Failed to open mic stream: {e}"))?;

    stream.play().map_err(|e| format!("Failed to start mic: {e}"))?;
    *RECORDING_STREAM.lock().unwrap() = Some(StreamWrapper(stream));

    Ok(())
}

#[tauri::command]
pub fn start_recording() -> Result<(), String> {
    // Prep the buffer with the previous 100ms audio payload
    let ring_arc = RING_BUFFER.lock().unwrap().clone();
    let active_arc = RECORDING_SAMPLES.lock().unwrap().clone();

    if let (Some(ring_vec), Some(active_vec)) = (ring_arc, active_arc) {
        let mut active = active_vec.lock().unwrap();
        let mut ring = ring_vec.lock().unwrap();
        active.clear();
        active.extend(ring.drain(..));
    }
    
    // Switch state so new mic frames stream into active tracking
    IS_RECORDING.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn get_audio_chunk(seconds: f64) -> Result<Vec<u8>, String> {
    if !IS_RECORDING.load(Ordering::Relaxed) {
        return Ok(vec![]);
    }

    let (sliced_samples, meta) = {
        let meta = RECORDING_META.lock().unwrap().as_ref().cloned().ok_or("No recording metadata")?;
        let active_arc = RECORDING_SAMPLES.lock().unwrap().clone();
        let arc = active_arc.ok_or("Not recording")?;
        let active = arc.lock().unwrap();

        let req_samples = (meta.sample_rate as f64 * meta.channels as f64 * seconds) as usize;
        let total = active.len();
        let start_idx = total.saturating_sub(req_samples);
        let slice = &active[start_idx..];

        // Advanced Silence Detection
        let max_amp = slice.iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
        if max_amp < 0.002 {
            return Ok(vec![]); // Return empty vec to signify absolute silence so frontend abandons processing API
        }
        (slice.to_vec(), meta)
    };

    if sliced_samples.is_empty() {
        return Ok(vec![]);
    }

    convert_samples_to_wav(&sliced_samples, &meta)
}

#[tauri::command]
pub fn stop_recording() -> Result<Vec<u8>, String> {
    // Disable recording, allowing continuous stream to switch back into 100ms idle polling 
    IS_RECORDING.store(false, Ordering::SeqCst);

    let samples = {
        let active_arc = RECORDING_SAMPLES.lock().unwrap().clone();
        let arc = active_arc.ok_or("Not recording")?;
        let mut active = arc.lock().unwrap();
        let s = active.clone();
        active.clear();
        s
    };

    let meta = {
        RECORDING_META.lock().unwrap().as_ref().cloned().ok_or("No recording metadata")?
    };

    if samples.is_empty() {
        return Err("No audio captured — microphone may be muted or access denied.".to_string());
    }

    convert_samples_to_wav(&samples, &meta)
}

/// Linear-interpolation resample to 16 kHz.
/// Speech energy lives in 300 Hz–4 kHz — well below the 8 kHz Nyquist of 16 kHz audio,
/// so linear interpolation is sufficient and avoids aliasing for voice.
fn resample_to_16k(samples: &[f32], from_rate: u32) -> Vec<f32> {
    const TARGET: u32 = 16_000;
    if from_rate == TARGET {
        return samples.to_vec();
    }
    let out_len = (samples.len() as f64 * TARGET as f64 / from_rate as f64).ceil() as usize;
    let mut out = Vec::with_capacity(out_len);
    let step = from_rate as f64 / TARGET as f64;
    for i in 0..out_len {
        let pos = i as f64 * step;
        let lo = pos as usize;
        let frac = (pos - lo as f64) as f32;
        let a = *samples.get(lo).unwrap_or(&0.0);
        let b = *samples.get(lo + 1).unwrap_or(&a);
        out.push(a + frac * (b - a));
    }
    out
}

fn convert_samples_to_wav(samples: &[f32], meta: &RecordingMeta) -> Result<Vec<u8>, String> {
    // 1. Mix down to mono
    let mut mono: Vec<f32> = if meta.channels == 1 {
        samples.to_vec()
    } else {
        samples
            .chunks(meta.channels as usize)
            .map(|frame| frame.iter().sum::<f32>() / meta.channels as f32)
            .collect()
    };

    // 2. Remove DC Offset (Center the waveform)
    if !mono.is_empty() {
        let mean = mono.iter().sum::<f32>() / mono.len() as f32;
        for s in mono.iter_mut() {
            *s -= mean;
        }
    }

    // 3. Peak Normalization (3x ceiling — 5x was too high, amplified background noise
    //    along with speech causing Whisper to hear noise as words)
    let max_amp = mono.iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
    let gain = if max_amp > 0.0001 { (0.95 / max_amp).min(3.0) } else { 1.0 };
    if gain > 1.0 {
        for s in mono.iter_mut() {
            *s = (*s * gain).clamp(-1.0, 1.0);
        }
    }

    // 4. Resample to 16 kHz
    let mono_16k = resample_to_16k(&mono, meta.sample_rate);

    // 5. Pre-emphasis Filter (boost high frequencies for consonant clarity)
    // y[n] = x[n] - 0.95 * x[n-1]
    // NOTE: 0.95 is the standard coefficient for Whisper-grade speech.
    // 0.97 was too aggressive — it over-boosted consonants, causing Whisper
    // to mishear words (e.g. "s" → "sh", "t" → "ch").
    let mut filtered = Vec::with_capacity(mono_16k.len());
    if !mono_16k.is_empty() {
        filtered.push(mono_16k[0]);
        for i in 1..mono_16k.len() {
            filtered.push(mono_16k[i] - 0.95 * mono_16k[i - 1]);
        }
    }

    // 6. Encode to 16-bit PCM WAV
    let mut cursor = Cursor::new(Vec::new());
    {
        let spec = WavSpec {
            channels: 1,
            sample_rate: 16_000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut writer = WavWriter::new(&mut cursor, spec)
            .map_err(|e| format!("WavWriter error: {e}"))?;
        for s in filtered {
            let pcm = (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
            writer.write_sample(pcm).map_err(|e| format!("Write error: {e}"))?;
        }
        writer.finalize().map_err(|e| format!("WAV finalize error: {e}"))?;
    }

    Ok(cursor.into_inner())
}
