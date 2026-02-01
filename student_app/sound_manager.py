import wave
import math
import struct
import os
import pygame

# Initialize Pygame Mixer
pygame.mixer.init()

def generate_beep(filename, duration=0.5, frequency=440.0, volume=0.5):
    """Generates a simple beep wav file."""
    sample_rate = 44100
    n_samples = int(sample_rate * duration)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) # Mono
        wav_file.setsampwidth(2) # 2 bytes per sample (16-bit)
        wav_file.setframerate(sample_rate)
        
        data = []
        for i in range(n_samples):
            # Generate sine wave
            value = int(volume * 32767.0 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
            data.append(struct.pack('<h', value))
            
        wav_file.writeframes(b''.join(data))

def create_app_sounds():
    """Generates necessary sound files if they don't exist."""
    base_path = os.path.join(os.path.dirname(__file__), "assets", "sounds")
    os.makedirs(base_path, exist_ok=True)
    
    sounds = {
        "start.wav": (0.3, 880.0),      # High pitch short beep
        "break.wav": (0.5, 440.0),      # Medium pitch
        "complete.wav": (0.8, 523.25),  # C5 note, longer
        "tada.wav": (0.2, 1000.0),      # Very high pitch
        "levelup.wav": (1.0, 659.25)    # E5 note
    }
    
    for name, (dur, freq) in sounds.items():
        path = os.path.join(base_path, name)
        if not os.path.exists(path):
            generate_beep(path, duration=dur, frequency=freq)
            
    # Create a dummy lo-fi track if it doesn't exist (just a soft hum)
    lofi_path = os.path.join(base_path, "lofi_rain.wav")
    if not os.path.exists(lofi_path):
        generate_beep(lofi_path, duration=5.0, frequency=220.0, volume=0.1) # Soft low hum

def play_sound(sound_name):
    """Plays a sound file using pygame."""
    sound_path = os.path.join(os.path.dirname(__file__), "assets", "sounds", sound_name)
    if os.path.exists(sound_path):
        try:
            pygame.mixer.Sound(sound_path).play()
        except Exception as e:
            print(f"Error playing sound: {e}")

def toggle_lofi(enable):
    """Toggles the background lo-fi track."""
    sound_path = os.path.join(os.path.dirname(__file__), "assets", "sounds", "lofi_rain.wav")
    if not os.path.exists(sound_path):
        return

    try:
        if enable:
            # Load and play indefinitely (-1)
            pygame.mixer.music.load(sound_path)
            pygame.mixer.music.play(loops=-1)
        else:
            pygame.mixer.music.stop()
    except Exception as e:
        print(f"Error toggling lofi: {e}")
