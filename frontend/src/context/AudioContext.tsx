import React, { createContext, useContext, useState, useEffect } from 'react';
import { audioService } from '../services/audio';
import type { SoundEffectType, BGMThemeType } from '../services/audio';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSE: (type: SoundEffectType) => void;
  playBGM: (theme: BGMThemeType) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getMuted());

  // Handle lazy initialization on first document interaction
  useEffect(() => {
    const handleInteraction = () => {
      audioService.init();
      // Remove listeners once context is initialized
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const toggleMute = () => {
    const newMuteState = audioService.toggleMute();
    setIsMuted(newMuteState);
  };

  const playSE = (type: SoundEffectType) => {
    audioService.playSE(type);
  };

  const playBGM = (theme: BGMThemeType) => {
    audioService.playBGM(theme);
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playSE, playBGM }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
