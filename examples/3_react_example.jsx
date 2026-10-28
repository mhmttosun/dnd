import React, { useEffect, useRef } from 'react';
import { ActivityPlayer } from '@mhmttosun/dnd/player';
import '@mhmttosun/dnd/player.css';

/**
 * React Bileşeni Örneği
 * 
 * Kullanım:
 * <ActivityPlayerView 
 *   data={activityJsonData} 
 *   sound={true}
 *   onComplete={(stats) => console.log('Bitti:', stats)} 
 * />
 */
export function ActivityPlayerView({ data, src, sound = true, onComplete, onStep }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Oynatıcıyı Başlat (Mount)
    playerRef.current = new ActivityPlayer({
      target: containerRef.current,
      data: data,
      src: src,
      sound: sound,
      onComplete: (stats) => {
        if (onComplete) onComplete(stats);
      },
      onStep: (state) => {
        if (onStep) onStep(state);
      }
    });

    // 2. Yaşam Döngüsü Temizliği (Unmount Cleanup)
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [data, src]);

  // Ses ayarı değişirse dinamik güncelle
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setSound(sound);
    }
  }, [sound]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '600px', position: 'relative' }} 
    />
  );
}

export default ActivityPlayerView;
