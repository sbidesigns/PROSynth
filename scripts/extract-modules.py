#!/usr/bin/env python3
"""Extract monolithic HTML into modular JS files"""

INPUT_FILE = '/home/z/my-project/vst-plugin/preview-pro.html'
BASE_DIR = '/home/z/my-project/vst-plugin'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Find script tags
script_start = None
script_end = None
for i, line in enumerate(lines):
    if '<script>' in line and script_start is None:
        script_start = i + 1
    if '</script>' in line and script_start is not None:
        script_end = i
        break

js_lines = lines[script_start:script_end]

def find_marker(marker, lines):
    for i, line in enumerate(lines):
        if marker in line:
            return i
    return -1

# Module boundaries (start_marker, end_marker)
boundaries = {
    'core.js': ('// ===== KNOB SYSTEM =====', '// ===== KEYBOARD ====='),
    'audio-engine.js': ('// ===== KEYBOARD =====', '// ===== VISUALIZER ====='),
    'ui.js': ('// ===== VISUALIZER =====', '// ===== PRESET MANAGEMENT ====='),
    'presets.js': ('// ===== PRESET MANAGEMENT =====', '// ===== SONG STARTER SYSTEM'),
    'song-starter.js': ('// ===== SONG STARTER SYSTEM', '// ===== SKIN SWITCHING SYSTEM ====='),
    'skin-system.js': ('// ===== SKIN SWITCHING SYSTEM =====', '// ===== 1. MIDI INPUT SUPPORT'),
    'midi.js': ('// ===== 1. MIDI INPUT SUPPORT', '// ===== 2. AUDIO RECORDING'),
    'features.js': ('// ===== 2. AUDIO RECORDING', '// ===== REVOLUTIONARY CREATIVE TOOLS'),
    'creative-tools.js': ('// ===== REVOLUTIONARY CREATIVE TOOLS', None)
}

for filename, (start_marker, end_marker) in boundaries.items():
    start_idx = find_marker(start_marker, js_lines) if start_marker else 0
    end_idx = find_marker(end_marker, js_lines) if end_marker else len(js_lines)
    
    module_lines = js_lines[start_idx:end_idx]
    
    output_path = f'{BASE_DIR}/js/{filename}'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(module_lines))
    
    print(f"Created {filename}: {len(module_lines)} lines")

print("\n✅ Module extraction complete!")
