/**
 * Audio utility functions for TTS playback
 */

/**
 * Convert base64 string to audio blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'audio/wav'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

/**
 * Create audio URL from base64 data
 */
export const createAudioUrl = (base64Audio: string): string => {
    const audioBlob = base64ToBlob(base64Audio);
    return URL.createObjectURL(audioBlob);
};

/**
 * Play audio from base64 data
 * Returns the audio element for control (pause, stop, etc.)
 */
export const playAudioFromBase64 = (
    base64Audio: string,
    onEnded?: () => void,
    onError?: (error: Error) => void
): HTMLAudioElement => {
    const audioUrl = createAudioUrl(base64Audio);
    const audio = new Audio(audioUrl);
    
    if (onEnded) {
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            onEnded();
        };
    }
    
    if (onError) {
        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            onError(new Error('Failed to play audio'));
        };
    }
    
    audio.play().catch((error) => {
        URL.revokeObjectURL(audioUrl);
        if (onError) {
            onError(error);
        }
    });
    
    return audio;
};

/**
 * Stop and clean up audio element
 */
export const stopAudio = (audio: HTMLAudioElement | null): void => {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = ''; // Release resources
    }
};
