#!/usr/bin/env python3
import sys

with open('drafts/coc.md', encoding='utf-8') as f:
    md = f.read()


def md_to_html(text):
    lines = text.split('\n')
    out = []
    in_ul = False
    for line in lines:
        if line.startswith('# '):
            if in_ul:
                out.append('</ul>')
                in_ul = False
            out.append(f'<h2>{line[2:].strip()}</h2>')
        elif line.startswith('## '):
            if in_ul:
                out.append('</ul>')
                in_ul = False
            out.append(f'<h3>{line[3:].strip()}</h3>')
        elif line.startswith('* '):
            if not in_ul:
                out.append('<ul>')
                in_ul = True
            out.append(f'<li>{line[2:].strip().rstrip(chr(92))}</li>')
        elif line.strip() == '':
            if in_ul:
                out.append('</ul>')
                in_ul = False
        else:
            if in_ul:
                out.append('</ul>')
                in_ul = False
            if line.strip():
                out.append(f'<p>{line.strip()}</p>')
    if in_ul:
        out.append('</ul>')
    return '\n'.join(out)


body = md_to_html(md)

html = '<!DOCTYPE html>\n'
html += '<html lang="fa" dir="rtl">\n<head>\n'
html += '<meta charset="UTF-8">\n'
html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
html += '<title>\u0645\u0646\u0634\u0648\u0631 \u0631\u0641\u062a\u0627\u0631\u06cc \u2014 DIFC</title>\n'
html += '<style>\n'
html += '  * { box-sizing: border-box; margin: 0; padding: 0; }\n'
html += '  body { font-family: "Vazirmatn","Tahoma",sans-serif; font-size: 14px; line-height: 1.8; color: #334155; padding: 16px; background: transparent; }\n'
html += '  h2 { font-size: 16px; font-weight: 700; margin: 0 0 12px; color: #1a1a2e; }\n'
html += '  h3 { font-size: 14px; font-weight: 700; margin: 16px 0 8px; color: #1a1a2e; }\n'
html += '  p  { margin-bottom: 8px; }\n'
html += '  ul { padding-right: 20px; padding-left: 0; margin-bottom: 8px; }\n'
html += '  li { margin-bottom: 4px; }\n'
html += '</style>\n'
html += '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">\n'
html += '</head>\n<body>\n'
html += body
html += '\n</body>\n</html>\n'

with open('coc.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('coc.html created:', len(html), 'bytes')
