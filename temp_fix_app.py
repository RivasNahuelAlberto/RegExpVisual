from pathlib import Path
p = Path(r'd:\Users\Usuario\N\UNLaM\PA\expo\frontend\src\App.jsx')
text = p.read_text(encoding='utf-8')
marker = 'export default function App() {'
imports_marker = "import pseudocodeByAlgorithm from './pseudocodeData';"
idx = text.find(marker)
imports_end = text.find(imports_marker)
if imports_end == -1 or idx == -1:
    raise SystemExit('marker not found')
imports_end += len(imports_marker)
new_text = text[:imports_end] + '\n\n' + text[idx:]
p.write_text(new_text, encoding='utf-8')
print('fixed')
