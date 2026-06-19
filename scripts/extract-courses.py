"""
Extract full module + lesson structure from all 3 course .docx files.
Save as JSON for the seed script.
"""
from docx import Document
import json
import re
import os

OUT = '/home/z/my-project/scripts/course-content.json'

def extract_course(fname, course_key):
    doc = Document(fname)
    modules = []
    current_module = None
    current_lesson_buffer = []
    current_lesson_title = None
    lesson_counter = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # Module detection
        if re.match(r'^M[ÓO]DULO\s*\d+', text, re.IGNORECASE) or text.lower().startswith('módulo '):
            # Save previous lesson if any
            if current_module and current_lesson_title and current_lesson_buffer:
                current_module['lessons'].append({
                    'title': current_lesson_title,
                    'content': '\n'.join(current_lesson_buffer),
                })
            # Clean module title (remove control chars)
            clean_title = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
            # Remove leading "Control+a..." artifacts
            clean_title = re.sub(r'^.*?M[ÓO]DULO', 'MÓDULO', clean_title)
            # Remove emojis at end (we'll add our own)
            clean_title = re.sub(r'\s*[\U0001F300-\U0001FAFF]\s*$', '', clean_title)
            clean_title = clean_title.strip()

            # Extract module number and title
            m = re.match(r'M[ÓO]DULO\s*(\d+)\s*:\s*(.+)', clean_title)
            if m:
                order_num = int(m.group(1))
                title = m.group(2).strip()
            else:
                order_num = len(modules) + 1
                title = clean_title

            current_module = {
                'order_num': order_num,
                'title': title,
                'lessons': [],
            }
            modules.append(current_module)
            current_lesson_title = None
            current_lesson_buffer = []
            lesson_counter = 0
            continue

        # Section/subsection detection — treat as lesson boundary
        # Pattern: "Sección N:", numbered section, or ALL-CAPS short heading
        is_section = bool(re.match(r'^Sección\s+\d+', text, re.IGNORECASE))
        is_subsection = bool(re.match(r'^\d+\.\s+[A-ZÁÉÍÓÚÑ]', text)) and len(text) < 80
        is_paso = bool(re.match(r'^PASO\s+\d+', text, re.IGNORECASE))

        if current_module and (is_section or is_paso) and len(text) < 100:
            # Save previous lesson
            if current_lesson_title and current_lesson_buffer:
                current_module['lessons'].append({
                    'title': current_lesson_title,
                    'content': '\n'.join(current_lesson_buffer),
                })
            lesson_counter += 1
            current_lesson_title = text
            current_lesson_buffer = []
            continue

        # Accumulate text into current lesson
        if current_module:
            if current_lesson_title is None:
                # Default intro lesson per module
                current_lesson_title = f'Introducción — {current_module["title"]}'
                current_lesson_buffer = []
            current_lesson_buffer.append(text)

    # Save last lesson of last module
    if current_module and current_lesson_title and current_lesson_buffer:
        current_module['lessons'].append({
            'title': current_lesson_title,
            'content': '\n'.join(current_lesson_buffer),
        })

    return modules


courses = {}

# Reddit
print('Extracting Reddit...')
courses['reddit'] = extract_course('/home/z/my-project/upload/Curso de Reddit.docx', 'reddit')
print(f'  Reddit: {len(courses["reddit"])} modules')

# Hombres
print('Extracting Hombres...')
courses['hombres'] = extract_course('/home/z/my-project/upload/curso only Hombres.docx', 'hombres')
print(f'  Hombres: {len(courses["hombres"])} modules')

# OnlyFans
print('Extracting OnlyFans...')
courses['onlyfans'] = extract_course('/home/z/my-project/upload/curso onlyfans Dinasty Academy.docx', 'onlyfans')
print(f'  OnlyFans: {len(courses["onlyfans"])} modules')

# Stats
total_lessons = 0
for course_key, modules in courses.items():
    print(f'\n{course_key.upper()}:')
    for m in modules:
        print(f'  M{m["order_num"]}: {m["title"][:60]} — {len(m["lessons"])} lessons')
        total_lessons += len(m["lessons"])

print(f'\nTOTAL LESSONS: {total_lessons}')

# Save
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(courses, f, ensure_ascii=False, indent=2)

print(f'\n✓ Saved to {OUT}')
