"""Патч для bravais_quiz_gui.py: добавляет кнопку Темы 8 в главное меню."""
import pathlib, sys

GUI_FILE = pathlib.Path("bravais_quiz_gui.py")
if not GUI_FILE.exists():
    print("Файл bravais_quiz_gui.py не найден.")
    sys.exit(1)

src = GUI_FILE.read_text(encoding="utf-8")

if "t8" in src:
    print("Кнопка Темы 8 уже есть — файл не изменён.")
    sys.exit(0)

OLD = '            ("Тема 5: полупроводники — носители, примеси, р-n переход",\n             lambda: self.app.show_theory_quiz("t5")),'
NEW = '            ("Тема 5: полупроводники — носители, примеси, р-n переход",\n             lambda: self.app.show_theory_quiz("t5")),\n            ("Тема 8: магнитные свойства — диа-, пара-, ферро-, антиферромагнетизм",\n             lambda: self.app.show_theory_quiz("t8")),'

if OLD not in src:
    print("Не удалось найти точку вставки — добавьте кнопку вручную:")
    print('  ("Тема 8: магнитные свойства...", lambda: self.app.show_theory_quiz("t8"))')
    sys.exit(1)

GUI_FILE.write_text(src.replace(OLD, NEW), encoding="utf-8")
print("Кнопка Темы 8 добавлена в bravais_quiz_gui.py")
