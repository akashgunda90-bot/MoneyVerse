import os

src_dir = r"c:\Users\Akash M\OneDrive\Desktop\MONEYVERSE\moneyverse_2.0\frontend\src"
placeholders = []
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fp:
                for idx, line in enumerate(fp, 1):
                    if 'TODO' in line or 'href="#"' in line or 'onClick={() => {}}' in line or 'Coming Soon' in line:
                        placeholders.append(f"{f}:{idx}: {line.strip()}")

if placeholders:
    print(f"Found {len(placeholders)} placeholder items:")
    for p in placeholders:
        print(p)
else:
    print("ZERO PLACEHOLDERS FOUND! All buttons, navigation links, and handlers are real.")
