// Legacy shim — new code should import from ./transcription
export type { TranscriptionResult } from "./transcription";
export { transcribeAudio, PROVIDERS } from "./transcription";
