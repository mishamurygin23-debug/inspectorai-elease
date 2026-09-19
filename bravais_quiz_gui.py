# -*- coding: utf-8 -*-
"""
Тренажёр по решёткам Браве и теории твёрдого тела — GUI-версия (tkinter).

Один таймер на 5 минут на весь тест, при ответе сразу видно правильно/
неправильно, при ошибке показывается развёрнутое объяснение (и слайд
лекции, если он есть). Все данные (вопросы, геометрия решёток) лежат в
соседнем файле bravais_quiz_data.py.

Запуск:
    python3 bravais_quiz_gui.py

Зависимости: numpy, matplotlib, (опционально) Pillow — для картинок.
Без Pillow тест просто работает без иллюстраций:
    pip install pillow
"""

import random
import tkinter as tk

from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

import bravais_quiz_data as data


# ---------------------------------------------------------------------------
# Внешний вид
# ---------------------------------------------------------------------------
TIMER_SECONDS = 5 * 60

BG       = "#1b1b26"
BG_CARD  = "#262635"
FG       = "#e8e8f0"
FG_DIM   = "#9999ab"
ACCENT   = "#5b8cff"
GREEN    = "#3fb950"
RED      = "#e5534b"
RED_DIM  = "#7a2620"
ORANGE   = "#d29922"

FONT_TITLE   = ("Arial", 19, "bold")
FONT_SUB     = ("Arial", 11)
FONT_Q       = ("Arial", 14, "bold")
FONT_OPT     = ("Arial", 11)
FONT_TIMER   = ("Consolas", 24, "bold")
FONT_BTN     = ("Arial", 11, "bold")
FONT_EXPLAIN = ("Arial", 11)
FONT_PROGRESS = ("Arial", 10)


def fmt_time(seconds):
    seconds = max(0, int(seconds))
    m, s = divmod(seconds, 60)
    return f"{m:02d}:{s:02d}"


# ---------------------------------------------------------------------------
# Таймер обратного отсчёта
# ---------------------------------------------------------------------------
class CountdownTimer(tk.Frame):
    def __init__(self, master, seconds=TIMER_SECONDS, on_timeout=None):
        super().__init__(master, bg=BG)
        self.remaining = seconds
        self.on_timeout = on_timeout
        self._job = None
        self._running = False
        self._flash_on = False

        tk.Label(self, text="осталось времени", font=FONT_SUB,
                 fg=FG_DIM, bg=BG).pack()
        self.label = tk.Label(self, text=fmt_time(seconds), font=FONT_TIMER,
                              fg=GREEN, bg=BG, width=6)
        self.label.pack()

    def start(self):
        if self._running:
            return
        self._running = True
        self._tick()

    def stop(self):
        self._running = False
        if self._job is not None:
            self.after_cancel(self._job)
            self._job = None

    def _tick(self):
        if not self._running:
            return
        self._render()
        if self.remaining <= 0:
            self._running = False
            if self.on_timeout:
                self.on_timeout()
            return
        self.remaining -= 1
        self._job = self.after(1000, self._tick)

    def _render(self):
        self.label.config(text=fmt_time(self.remaining))
        if self.remaining <= 10:
            self._flash_on = not self._flash_on
            self.label.config(fg=RED if self._flash_on else RED_DIM)
        elif self.remaining <= 30:
            self.label.config(fg=RED)
        elif self.remaining <= 90:
            self.label.config(fg=ORANGE)
        else:
            self.label.config(fg=GREEN)


# ---------------------------------------------------------------------------
# Верхняя панель
# ---------------------------------------------------------------------------
def build_topbar(master, app, title, with_timer, on_timeout=None):
    bar = tk.Frame(master, bg=BG)
    bar.pack(fill="x", padx=18, pady=(14, 4))

    left = tk.Frame(bar, bg=BG)
    left.pack(side="left", anchor="w")
    tk.Button(left, text="\u2190 в меню", font=FONT_BTN, fg=FG, bg=BG_CARD,
              activebackground=BG_CARD, activeforeground=FG, bd=0,
              padx=10, pady=4, command=app.show_menu).pack(anchor="w")
    tk.Label(left, text=title, font=FONT_TITLE, fg=FG, bg=BG,
             wraplength=560, justify="left").pack(anchor="w", pady=(6, 0))

    timer = None
    if with_timer:
        timer = CountdownTimer(bar, TIMER_SECONDS, on_timeout=on_timeout)
        timer.pack(side="right", anchor="ne")

    return bar, timer


# ---------------------------------------------------------------------------
# Главное меню
# ---------------------------------------------------------------------------
class MenuFrame(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master, bg=BG)
        self.app = app

        tk.Label(self, text="Тренажёр по физике твёрдого тела", font=FONT_TITLE,
                 fg=FG, bg=BG).pack(pady=(36, 2))
        tk.Label(self, text="на каждый тест — 5 минут на весь тест целиком",
                 font=FONT_SUB, fg=FG_DIM, bg=BG).pack(pady=(0, 28))

        card = tk.Frame(self, bg=BG)
        card.pack()

        buttons = [
            ("Угадать решётку Браве  (с таймером)",
             self.app.show_lattice_quiz),
            ("Галерея решёток Браве  (без таймера, для изучения)",
             self.app.show_gallery),
            ("Тема 2: кристаллография, симметрия, дифракция",
             lambda: self.app.show_theory_quiz("t2")),
            ("Тема 3, ч.1: гармонический кристалл, фононы",
             lambda: self.app.show_theory_quiz("t3")),
            ("Тема 3, ч.2: модель Дебая",
             lambda: self.app.show_theory_quiz("debye")),
            ("Тема 4: свободные электроны, Друде, Зоммерфельд, Блох",
             lambda: self.app.show_theory_quiz("t4")),
            ("Тема 5: полупроводники — носители, примеси, р-n переход",
             lambda: self.app.show_theory_quiz("t5")),
            ("Тема 8: магнитные свойства — диа-, пара-, ферро-, антиферромагнетизм",
             lambda: self.app.show_theory_quiz("t8")),
            ("Тема 9: свойства диэлектриков — поляризация, пьезо-, пиро-, сегнетоэлектрики",
             lambda: self.app.show_theory_quiz("t9")),
        ]
        for text, cmd in buttons:
            b = tk.Button(card, text=text, font=FONT_BTN, fg=FG, bg=BG_CARD,
                          activebackground=ACCENT, activeforeground="white",
                          bd=0, padx=18, pady=14, width=46, anchor="w",
                          command=cmd)
            b.pack(pady=6)

        tk.Button(self, text="Выход", font=FONT_BTN, fg=FG_DIM, bg=BG,
                  activebackground=BG, activeforeground=FG, bd=0,
                  command=self.app.destroy).pack(pady=(28, 0))


# ---------------------------------------------------------------------------
# Экран результатов
# ---------------------------------------------------------------------------
class ResultsFrame(tk.Frame):
    def __init__(self, master, app, title, correct, answered, total=None,
                 retry_callback=None):
        super().__init__(master, bg=BG)
        self.app = app

        tk.Label(self, text=title, font=FONT_TITLE, fg=FG, bg=BG).pack(pady=(60, 14))

        pct = (correct / answered * 100) if answered else 0
        line = f"Правильных ответов: {correct} из {answered}  ({pct:.0f}%)"
        tk.Label(self, text=line, font=("Arial", 15), fg=FG, bg=BG).pack(pady=4)

        if total is not None and answered < total:
            tk.Label(self,
                     text=f"Успели ответить на {answered} вопросов из {total}",
                     font=FONT_SUB, fg=FG_DIM, bg=BG).pack(pady=2)

        btn_row = tk.Frame(self, bg=BG)
        btn_row.pack(pady=30)
        if retry_callback is not None:
            tk.Button(btn_row, text="Заново", font=FONT_BTN, fg="white", bg=ACCENT,
                      activebackground=ACCENT, bd=0, padx=20, pady=10,
                      command=retry_callback).pack(side="left", padx=8)
        tk.Button(btn_row, text="В меню", font=FONT_BTN, fg=FG, bg=BG_CARD,
                  activebackground=BG_CARD, activeforeground=FG, bd=0,
                  padx=20, pady=10, command=app.show_menu).pack(side="left", padx=8)


# ---------------------------------------------------------------------------
# Тест "угадать решётку Браве"
# ---------------------------------------------------------------------------
class LatticeQuizFrame(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master, bg=BG)
        self.app = app
        self.correct = 0
        self.answered = 0
        self.current_key = None
        self.last_key = None
        self.locked = False
        self.canvas_widget = None

        _, self.timer = build_topbar(self, app, "Угадать решётку Браве",
                                     with_timer=True, on_timeout=self.on_timeout)
        self.app.active_timer = self.timer

        self.progress_lbl = tk.Label(self, text="", font=FONT_PROGRESS,
                                     fg=FG_DIM, bg=BG)
        self.progress_lbl.pack(anchor="w", padx=22)

        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True, padx=18, pady=10)

        self.plot_holder = tk.Frame(body, bg=BG_CARD, width=420, height=400)
        self.plot_holder.pack(side="left", padx=(0, 16), pady=4)
        self.plot_holder.pack_propagate(False)

        self.relation_lbl = tk.Label(self, text="", font=FONT_SUB, fg=FG_DIM, bg=BG)
        self.relation_lbl.pack(anchor="w", padx=22)

        right = tk.Frame(body, bg=BG)
        right.pack(side="left", fill="both", expand=True)

        self.options_grid = tk.Frame(right, bg=BG)
        self.options_grid.pack(anchor="n")
        self.option_buttons = []

        self.feedback_lbl = tk.Label(right, text="", font=FONT_Q, bg=BG,
                                     wraplength=440, justify="left")
        self.feedback_lbl.pack(anchor="w", pady=(14, 4))

        self.hint_text = tk.Label(right, text="", font=FONT_EXPLAIN, fg=FG,
                                  bg=BG, wraplength=440, justify="left")
        self.hint_text.pack(anchor="w")

        self.next_btn = tk.Button(right, text="Далее \u2192", font=FONT_BTN,
                                  fg="white", bg=ACCENT, activebackground=ACCENT,
                                  bd=0, padx=18, pady=8, command=self.next_question)

        self.timer.start()
        self.next_question()

    def cleanup(self):
        self.timer.stop()

    def _clear_plot(self):
        if self.canvas_widget is not None:
            self.canvas_widget.destroy()
            self.canvas_widget = None

    def _draw(self, key):
        self._clear_plot()
        fig = Figure(figsize=(4.0, 3.8), dpi=92, facecolor=BG_CARD)
        ax = fig.add_subplot(111, projection="3d")
        ax.set_facecolor(BG_CARD)
        data.draw_lattice(ax, key, show_title=False, show_relation=False)
        canvas = FigureCanvasTkAgg(fig, master=self.plot_holder)
        canvas.draw()
        self.canvas_widget = canvas.get_tk_widget()
        self.canvas_widget.pack(fill="both", expand=True)

    def next_question(self):
        self.next_btn.pack_forget()
        self.feedback_lbl.config(text="")
        self.hint_text.config(text="")

        key = random.choice(data.ORDER)
        while key == self.last_key and len(data.ORDER) > 1:
            key = random.choice(data.ORDER)
        self.last_key = key
        self.current_key = key
        self.locked = False

        self._draw(key)
        info = data.LATTICES[key]
        self.relation_lbl.config(
            text=f"параметры ячейки: {data.relation_str(info['params'])}")

        for b in self.option_buttons:
            b.destroy()
        self.option_buttons = []

        names = list(data.ORDER)
        random.shuffle(names)
        cols = 2
        for i, k in enumerate(names):
            text = data.LATTICES[k]["name"]
            b = tk.Button(self.options_grid, text=text, font=FONT_OPT, fg=FG,
                          bg=BG_CARD, activebackground=ACCENT,
                          activeforeground="white", bd=0, padx=8, pady=10,
                          width=30, wraplength=240, justify="left", anchor="w",
                          command=lambda _k=k: self.on_answer(_k))
            b.grid(row=i // cols, column=i % cols, padx=4, pady=3, sticky="w")
            self.option_buttons.append(b)

        self._update_progress()

    def _update_progress(self):
        self.progress_lbl.config(
            text=f"Решёток отгадано: {self.answered} \u00b7 правильно: {self.correct}")

    def on_answer(self, key):
        if self.locked:
            return
        self.locked = True
        self.answered += 1
        is_correct = (key == self.current_key)
        if is_correct:
            self.correct += 1

        for b in self.option_buttons:
            label = b.cget("text")
            if label == data.LATTICES[self.current_key]["name"]:
                b.config(bg=GREEN, fg="white")
            elif label == data.LATTICES[key]["name"] and not is_correct:
                b.config(bg=RED, fg="white")
            b.config(state="disabled")

        if is_correct:
            self.feedback_lbl.config(text="\u2705 Верно!", fg=GREEN)
        else:
            self.feedback_lbl.config(text="\u274c Неверно", fg=RED)

        hint = data.LATTICES[self.current_key]["hint"]
        self.hint_text.config(
            text=f"Правильный ответ: {data.LATTICES[self.current_key]['name']}.\n{hint}")

        self._update_progress()
        self.next_btn.pack(anchor="w", pady=(12, 0))

    def on_timeout(self):
        self.locked = True
        for b in self.option_buttons:
            b.config(state="disabled")
        self.next_btn.pack_forget()
        self.app.show_results(
            "\u23f0 Время вышло!", self.correct, self.answered,
            retry_callback=self.app.show_lattice_quiz)


# ---------------------------------------------------------------------------
# Галерея решёток
# ---------------------------------------------------------------------------
class GalleryFrame(tk.Frame):
    def __init__(self, master, app):
        super().__init__(master, bg=BG)
        self.app = app

        build_topbar(self, app, "Галерея: все 14 решёток Браве", with_timer=False)

        fig = Figure(figsize=(11.5, 8.3), dpi=85, facecolor=BG)
        for i, key in enumerate(data.ORDER):
            ax = fig.add_subplot(4, 4, i + 1, projection="3d")
            ax.set_facecolor(BG)
            data.draw_lattice(ax, key, show_title=True, show_relation=False)
            ax.title.set_color(FG)
            ax.title.set_fontsize(7.5)

        fig.tight_layout(pad=0.6)
        canvas = FigureCanvasTkAgg(fig, master=self)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True, padx=10, pady=4)

    def cleanup(self):
        pass


# ---------------------------------------------------------------------------
# Теоретические тесты
# ---------------------------------------------------------------------------
class TheoryQuizFrame(tk.Frame):
    def __init__(self, master, app, test_key):
        super().__init__(master, bg=BG)
        self.app = app
        self.test_key = test_key
        test = data.THEORY_TESTS[test_key]
        self.title_text = test["title"]
        self.image_key  = test["image_key"]

        self.questions = list(test["questions"])
        random.shuffle(self.questions)

        self.idx = 0
        self.correct = 0
        self.answered = 0
        self.locked = False
        self.display_options = []
        self.correct_display_idx = None
        self._photo_ref = None

        _, self.timer = build_topbar(self, app, self.title_text,
                                     with_timer=True, on_timeout=self.on_timeout)
        self.app.active_timer = self.timer

        self.progress_lbl = tk.Label(self, text="", font=FONT_PROGRESS,
                                     fg=FG_DIM, bg=BG)
        self.progress_lbl.pack(anchor="w", padx=22, pady=(0, 6))

        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True, padx=22, pady=4)

        self.q_lbl = tk.Label(body, text="", font=FONT_Q, fg=FG, bg=BG,
                               wraplength=820, justify="left")
        self.q_lbl.pack(anchor="w", pady=(0, 12))

        self.options_box = tk.Frame(body, bg=BG)
        self.options_box.pack(anchor="w", fill="x")
        self.option_buttons = []

        self.feedback_lbl = tk.Label(body, text="", font=FONT_Q, bg=BG)
        self.feedback_lbl.pack(anchor="w", pady=(12, 4))

        lower = tk.Frame(body, bg=BG)
        lower.pack(fill="both", expand=True, pady=(2, 0))

        self.explain_lbl = tk.Label(lower, text="", font=FONT_EXPLAIN, fg=FG,
                                    bg=BG, wraplength=560, justify="left")
        self.explain_lbl.pack(side="left", anchor="n", fill="x", expand=True)

        self.image_lbl = tk.Label(lower, bg=BG)
        self.image_lbl.pack(side="left", anchor="n", padx=(16, 0))

        self.next_btn = tk.Button(body, text="Далее \u2192", font=FONT_BTN,
                                  fg="white", bg=ACCENT, activebackground=ACCENT,
                                  bd=0, padx=18, pady=8, command=self.next_question)

        self.timer.start()
        self.show_question()

    def cleanup(self):
        self.timer.stop()

    def _update_progress(self):
        self.progress_lbl.config(
            text=f"Вопрос {self.idx + 1} из {len(self.questions)} \u00b7 "
                 f"правильно: {self.correct} из {self.answered}")

    def show_question(self):
        self.next_btn.pack_forget()
        self.feedback_lbl.config(text="")
        self.explain_lbl.config(text="")
        self.image_lbl.config(image="", text="")
        self._photo_ref = None
        self.locked = False

        q = self.questions[self.idx]
        self.q_lbl.config(text=q["q"])

        pairs = list(enumerate(q["options"]))
        random.shuffle(pairs)
        self.display_options = pairs
        self.correct_display_idx = next(
            i for i, (orig_idx, _t) in enumerate(pairs) if orig_idx == q["correct"])

        for b in self.option_buttons:
            b.destroy()
        self.option_buttons = []

        for i, (_orig_idx, text) in enumerate(pairs):
            b = tk.Button(self.options_box, text=text, font=FONT_OPT, fg=FG,
                          bg=BG_CARD, activebackground=ACCENT,
                          activeforeground="white", bd=0, padx=14, pady=10,
                          wraplength=760, justify="left", anchor="w",
                          command=lambda _i=i: self.on_answer(_i))
            b.pack(fill="x", pady=4)
            self.option_buttons.append(b)

        self._update_progress()

    def on_answer(self, display_idx):
        if self.locked:
            return
        self.locked = True
        self.answered += 1
        is_correct = (display_idx == self.correct_display_idx)
        if is_correct:
            self.correct += 1

        for i, b in enumerate(self.option_buttons):
            if i == self.correct_display_idx:
                b.config(bg=GREEN, fg="white")
            elif i == display_idx and not is_correct:
                b.config(bg=RED, fg="white")
            b.config(state="disabled")

        q = self.questions[self.idx]
        if is_correct:
            self.feedback_lbl.config(text="\u2705 Верно!", fg=GREEN)
        else:
            self.feedback_lbl.config(text="\u274c Неверно", fg=RED)

        self.explain_lbl.config(text=q.get("explain", ""))
        img_name = q.get("image")
        path = data.image_path_for(self.image_key, img_name) if img_name else None
        if path and HAS_PIL:
            try:
                img = Image.open(path)
                img.thumbnail((300, 300))
                self._photo_ref = ImageTk.PhotoImage(img)
                self.image_lbl.config(image=self._photo_ref)
            except Exception:
                self._photo_ref = None

        self._update_progress()
        self.next_btn.pack(anchor="w", pady=(14, 0))

    def next_question(self):
        self.idx += 1
        if self.idx >= len(self.questions):
            self.finish("\u2705 Тест пройден!")
            return
        self.show_question()

    def finish(self, title):
        self.timer.stop()
        self.app.show_results(
            title, self.correct, self.answered, total=len(self.questions),
            retry_callback=lambda: self.app.show_theory_quiz(self.test_key))

    def on_timeout(self):
        self.locked = True
        for b in self.option_buttons:
            b.config(state="disabled")
        self.next_btn.pack_forget()
        self.app.show_results(
            "\u23f0 Время вышло!", self.correct, self.answered,
            total=len(self.questions),
            retry_callback=lambda: self.app.show_theory_quiz(self.test_key))


# ---------------------------------------------------------------------------
# Главное приложение
# ---------------------------------------------------------------------------
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Тренажёр по физике твёрдого тела")
        self.configure(bg=BG)
        self.geometry("1080x760")
        self.minsize(940, 660)

        self.container = tk.Frame(self, bg=BG)
        self.container.pack(fill="both", expand=True)

        self.current_frame = None
        self.active_timer  = None

        self.show_menu()

    def _switch(self, frame):
        if self.active_timer is not None:
            self.active_timer.stop()
            self.active_timer = None
        if self.current_frame is not None:
            cleanup = getattr(self.current_frame, "cleanup", None)
            if cleanup:
                cleanup()
            self.current_frame.destroy()
        self.current_frame = frame
        self.current_frame.pack(fill="both", expand=True)

    def show_menu(self):
        self._switch(MenuFrame(self.container, self))

    def show_lattice_quiz(self):
        self._switch(LatticeQuizFrame(self.container, self))

    def show_gallery(self):
        self._switch(GalleryFrame(self.container, self))

    def show_theory_quiz(self, test_key):
        self._switch(TheoryQuizFrame(self.container, self, test_key))

    def show_results(self, title, correct, answered, total=None, retry_callback=None):
        self._switch(ResultsFrame(self.container, self, title, correct, answered,
                                  total=total, retry_callback=retry_callback))


if __name__ == "__main__":
    App().mainloop()