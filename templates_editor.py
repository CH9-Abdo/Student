"""
Templates.js Editor - PyQt5 Application
A GUI tool to read, edit, and save templates.js files
"""

import sys
import re
import json
import copy
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QSplitter, QTreeWidget, QTreeWidgetItem,
    QVBoxLayout, QHBoxLayout, QFormLayout, QLabel, QLineEdit, QPushButton,
    QCheckBox, QGroupBox, QScrollArea, QFileDialog, QMessageBox, QToolBar,
    QAction, QStatusBar, QFrame, QSizePolicy, QDialog, QDialogButtonBox,
    QComboBox, QTextEdit, QMenu, QAbstractItemView, QShortcut
)
from PyQt5.QtCore import Qt, QSize, pyqtSignal
from PyQt5.QtGui import (
    QIcon, QFont, QColor, QPalette, QKeySequence, QFontMetrics
)

# ─────────────────────────────────────────────
#  Color palette  (Light theme)
# ─────────────────────────────────────────────
COLORS = {
    "bg":       "#f5f5f7",
    "panel":    "#ffffff",
    "surface":  "#e8e8ed",
    "border":   "#c7c7cc",
    "accent":   "#5856d6",
    "accent2":  "#007aff",
    "accent3":  "#34c759",
    "danger":   "#ff3b30",
    "warning":  "#ff9500",
    "text":     "#1c1c1e",
    "subtext":  "#3a3a3c",
    "overlay":  "#8e8e93",
}

STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: {COLORS['bg']};
    color: {COLORS['text']};
    font-family: 'Segoe UI', 'Roboto', 'DejaVu Sans', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
    font-size: 13px;
}}

QTreeWidget {{
    background-color: {COLORS['panel']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 4px;
    outline: none;
    color: {COLORS['text']};
    font-size: 12px;
}}
QTreeWidget::item {{
    padding: 4px 6px;
    border-radius: 4px;
    margin: 1px 2px;
}}
QTreeWidget::item:selected {{
    background-color: {COLORS['accent']};
    color: #ffffff;
}}
QTreeWidget::item:hover:!selected {{
    background-color: {COLORS['surface']};
}}

QLineEdit, QComboBox, QTextEdit {{
    background-color: {COLORS['panel']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 6px 10px;
    color: {COLORS['text']};
    selection-background-color: {COLORS['accent']};
    selection-color: #ffffff;
}}
QLineEdit:focus, QComboBox:focus, QTextEdit:focus {{
    border: 1.5px solid {COLORS['accent']};
}}

QLabel {{
    color: {COLORS['subtext']};
    font-size: 12px;
}}

QPushButton {{
    background-color: {COLORS['surface']};
    color: {COLORS['text']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
}}
QPushButton:hover {{
    background-color: {COLORS['accent']};
    color: #ffffff;
    border: 1px solid {COLORS['accent']};
}}
QPushButton:pressed {{
    background-color: {COLORS['accent2']};
}}
QPushButton#btnDanger {{
    color: {COLORS['danger']};
    border-color: {COLORS['danger']};
}}
QPushButton#btnDanger:hover {{
    background-color: {COLORS['danger']};
    color: #ffffff;
}}
QPushButton#btnSuccess {{
    color: {COLORS['accent3']};
    border-color: {COLORS['accent3']};
}}
QPushButton#btnSuccess:hover {{
    background-color: {COLORS['accent3']};
    color: #ffffff;
}}
QPushButton#btnAccent {{
    background-color: {COLORS['accent']};
    color: #ffffff;
    border: none;
    font-weight: 600;
}}
QPushButton#btnAccent:hover {{
    background-color: {COLORS['accent2']};
}}

QCheckBox {{
    color: {COLORS['text']};
    spacing: 8px;
}}
QCheckBox::indicator {{
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1.5px solid {COLORS['border']};
    background: {COLORS['panel']};
}}
QCheckBox::indicator:checked {{
    background-color: {COLORS['accent']};
    border-color: {COLORS['accent']};
}}

QGroupBox {{
    border: 1px solid {COLORS['border']};
    border-radius: 8px;
    margin-top: 10px;
    padding-top: 8px;
    color: {COLORS['overlay']};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: {COLORS['panel']};
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 6px;
    left: 12px;
}}

QScrollArea {{ border: none; background: transparent; }}
QScrollBar:vertical {{
    background: {COLORS['surface']};
    width: 8px;
    border-radius: 4px;
}}
QScrollBar::handle:vertical {{
    background: {COLORS['border']};
    border-radius: 4px;
    min-height: 20px;
}}
QScrollBar::handle:vertical:hover {{
    background: {COLORS['overlay']};
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0px; }}

QToolBar {{
    background-color: {COLORS['panel']};
    border-bottom: 1px solid {COLORS['border']};
    spacing: 4px;
    padding: 4px 8px;
}}
QToolBar QToolButton {{
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 5px 10px;
    color: {COLORS['text']};
    font-size: 12px;
}}
QToolBar QToolButton:hover {{
    background: {COLORS['surface']};
    border-color: {COLORS['border']};
}}

QStatusBar {{
    background-color: {COLORS['panel']};
    color: {COLORS['overlay']};
    border-top: 1px solid {COLORS['border']};
    font-size: 11px;
}}

QMenu {{
    background-color: {COLORS['panel']};
    border: 1px solid {COLORS['border']};
    border-radius: 6px;
    padding: 4px;
    color: {COLORS['text']};
}}
QMenu::item {{ padding: 6px 20px; border-radius: 4px; }}
QMenu::item:selected {{ background-color: {COLORS['accent']}; color: #ffffff; }}
QMenu::separator {{ height: 1px; background: {COLORS['border']}; margin: 4px 8px; }}

QSplitter::handle {{
    background-color: {COLORS['border']};
    width: 1px;
}}

QDialog {{
    background-color: {COLORS['bg']};
}}
QDialogButtonBox QPushButton {{
    min-width: 80px;
}}
"""


# ─────────────────────────────────────────────
#  JS Parser / Writer
# ─────────────────────────────────────────────

def parse_js_file(filepath: str):
    """Parse templates.js and return Python list.
    Handles JS object literals with unquoted keys and trailing commas.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove comments carefully
    # Use a regex that ignores // inside strings
    # We strip the variable declaration first to make it easier
    content = re.sub(r'^\s*const\s+TEMPLATES\s*=\s*', '', content, flags=re.MULTILINE)
    content = content.strip().rstrip(';').strip()

    # Remove single line comments that are on their own line or at the end of line
    # but NOT inside a string (rough approximation)
    def remove_comments(text):
        # Match strings first so we can ignore them
        # This matches "..." and '...'
        pattern = r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')|//.*'
        def subst(m):
            if m.group(1): return m.group(1) # it's a string, keep it
            return "" # it's a comment, remove it
        return re.compile(pattern).sub(subst, text)

    content = remove_comments(content)

    # 2. Remove multi-line comments  /* ... */
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    # 3. Quote unquoted JS object keys  e.g.  year:  →  "year":
    # Only match keys that are not already quoted
    # We use a negative lookbehind for quotes
    content = re.sub(
        r'(?<!["\'\w])([a-zA-Z_][a-zA-Z0-9_]*)\s*:(?!:)',
        lambda m: f'"{m.group(1)}":',
        content
    )

    # 4. Remove trailing commas before  }  or  ]
    content = re.sub(r',\s*([}\]])', r'\1', content)

    # 5. Parse as JSON
    data = json.loads(content)
    return data


def write_js_file(filepath: str, templates: list):
    """Write templates list back to JS file."""
    lines = ["const TEMPLATES = [\n"]

    for i, tmpl in enumerate(templates):
        # Year comment header at first occurrence
        year = tmpl.get("year", "")
        if year not in [templates[j].get("year") for j in range(i)]:
            yr_label = year.upper()
            lines.append(f"    // ==================== {yr_label} ====================\n")

        lines.append("    {\n")
        lines.append(f'        year: "{tmpl["year"]}",\n')
        lines.append(f'        name: "{tmpl["name"]}",\n')
        lines.append("        subjects: [\n")

        subjects = tmpl.get("subjects", [])
        for si, subj in enumerate(subjects):
            lines.append("            { \n")
            lines.append(f'                name: "{subj["name"]}", \n')
            if "has_exercises" in subj and subj["has_exercises"] is False:
                lines.append("                has_exercises: false,\n")
            
            chapters = subj.get("chapters", [])
            lines.append("                chapters: [\n")
            chapter_blocks = []
            for ch in chapters:
                if isinstance(ch, dict):
                    ch_lines = []
                    ch_lines.append(f'                    {{ name: "{ch["name"]}"')
                    
                    if "url" in ch and ch["url"]:
                        ch_lines.append(f', url: "{ch["url"]}"')
                    
                    if "resources" in ch and ch["resources"]:
                        res_list = []
                        for r in ch["resources"]:
                            res_obj = f'{{ type: "{r["type"]}", url: "{r["url"]}", label: "{r["label"]}" }}'
                            res_list.append(res_obj)
                        ch_lines.append(f', resources: [{", ".join(res_list)}]')
                    
                    ch_lines.append(' }')
                    chapter_blocks.append("".join(ch_lines))
                else:
                    chapter_blocks.append(f'                    "{ch}"')
            
            lines.append(",\n".join(chapter_blocks))
            if chapter_blocks:
                lines.append("\n")
            lines.append("                ] \n")
            comma = "," if si < len(subjects) - 1 else ""
            lines.append(f"            }}{comma}\n")

        lines.append("        ]\n")
        comma = "," if i < len(templates) - 1 else ""
        lines.append(f"    }}{comma}\n")

    lines.append("];\n")

    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)


# ─────────────────────────────────────────────
#  Tree item data roles
# ─────────────────────────────────────────────
ROLE_TYPE = Qt.UserRole + 1    # "template" | "subject" | "chapter"
ROLE_IDX  = Qt.UserRole + 2    # index(es) as tuple


# ─────────────────────────────────────────────
#  Dialogs
# ─────────────────────────────────────────────

class TemplateDialog(QDialog):
    def __init__(self, parent=None, data=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Template" if data else "Add Template")
        self.setMinimumWidth(460)
        self.data = data or {"year": "bac", "name": "", "subjects": []}
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignRight)
        form.setSpacing(10)

        self.year_combo = QComboBox()
        years = ["bac", "2as", "1as", "l1", "l2", "l3", "m1", "m2"]
        self.year_combo.addItems(years)
        idx = self.year_combo.findText(self.data.get("year", "bac"))
        if idx >= 0:
            self.year_combo.setCurrentIndex(idx)
        # Allow custom year
        self.year_combo.setEditable(True)
        form.addRow("Year:", self.year_combo)

        self.name_edit = QLineEdit(self.data.get("name", ""))
        self.name_edit.setPlaceholderText("e.g. BAC Sciences Expérimentales (شعبة العلوم التجريبية)")
        form.addRow("Name:", self.name_edit)

        layout.addLayout(form)

        btns = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

    def get_data(self):
        d = copy.deepcopy(self.data)
        d["year"] = self.year_combo.currentText().strip()
        d["name"] = self.name_edit.text().strip()
        return d


class SubjectDialog(QDialog):
    def __init__(self, parent=None, data=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Subject" if data else "Add Subject")
        self.setMinimumWidth(400)
        self.data = data or {"name": "", "chapters": []}
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignRight)
        form.setSpacing(10)

        self.name_edit = QLineEdit(self.data.get("name", ""))
        self.name_edit.setPlaceholderText("Subject name")
        form.addRow("Name:", self.name_edit)

        self.has_ex_cb = QCheckBox("Has Exercises")
        self.has_ex_cb.setChecked(self.data.get("has_exercises", True))
        form.addRow("", self.has_ex_cb)

        layout.addLayout(form)

        btns = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

    def get_data(self):
        d = copy.deepcopy(self.data)
        d["name"] = self.name_edit.text().strip()
        has_ex = self.has_ex_cb.isChecked()
        if not has_ex:
            d["has_exercises"] = False
        elif "has_exercises" in d:
            del d["has_exercises"]
        return d


class ChapterDialog(QDialog):
    def __init__(self, parent=None, data=None, is_url_type=True):
        super().__init__(parent)
        self.setWindowTitle("Edit Chapter" if data else "Add Chapter")
        self.setMinimumWidth(550)
        self.is_url_type = is_url_type
        if data is None:
            self.data = {"name": "", "url": "", "resources": []}
        else:
            if isinstance(data, str):
                self.data = {"name": data, "url": "", "resources": []}
            else:
                self.data = data
                if "resources" not in self.data:
                    self.data["resources"] = []
                    # Migrate single url to resources if exists
                    if "url" in self.data and self.data["url"]:
                        self.data["resources"].append({"type": "video", "url": self.data["url"], "label": "Video Lesson"})
        
        self.resources = copy.deepcopy(self.data.get("resources", []))
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignRight)
        form.setSpacing(10)

        self.name_edit = QLineEdit()
        self.name_edit.setLayoutDirection(Qt.RightToLeft)
        self.name_edit.setText(self.data.get("name", ""))
        self.name_edit.setPlaceholderText("Chapter name")
        form.addRow("Name:", self.name_edit)
        layout.addLayout(form)

        # Resources Section
        layout.addWidget(QLabel("<b>Resources (PDFs, Videos, etc.):</b>"))
        
        self.res_list = QTreeWidget()
        self.res_list.setHeaderLabels(["Type", "Label", "URL"])
        self.res_list.setColumnWidth(0, 80)
        self.res_list.setColumnWidth(1, 150)
        self.res_list.setMinimumHeight(150)
        layout.addWidget(self.res_list)
        self._refresh_res_list()

        res_btns = QHBoxLayout()
        add_btn = QPushButton("➕ Add Resource")
        add_btn.clicked.connect(self._add_res)
        del_btn = QPushButton("🗑 Remove Selected")
        del_btn.clicked.connect(self._del_res)
        res_btns.addWidget(add_btn)
        res_btns.addWidget(del_btn)
        layout.addLayout(res_btns)

        btns = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

    def _refresh_res_list(self):
        self.res_list.clear()
        for res in self.resources:
            item = QTreeWidgetItem([res.get("type",""), res.get("label",""), res.get("url","")])
            self.res_list.addTopLevelItem(item)

    def _add_res(self):
        dlg = ResourceDialog(self)
        if dlg.exec_() == QDialog.Accepted:
            self.resources.append(dlg.get_data())
            self._refresh_res_list()

    def _del_res(self):
        idx = self.res_list.indexOfTopLevelItem(self.res_list.currentItem())
        if idx >= 0:
            self.resources.pop(idx)
            self._refresh_res_list()

    def get_data(self):
        name = self.name_edit.text().strip()
        # Keep 'url' field for backward compatibility if a video exists
        url = ""
        for r in self.resources:
            if r["type"] == "video":
                url = r["url"]
                break
        return {"name": name, "url": url, "resources": self.resources}


class ResourceDialog(QDialog):
    def __init__(self, parent=None, data=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Resource" if data else "Add Resource")
        self.setMinimumWidth(450)
        self.data = data or {"type": "video", "label": "", "url": ""}
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        form = QFormLayout()
        
        self.type_combo = QComboBox()
        self.type_combo.addItems(["video", "pdf", "exercise", "exam", "other"])
        self.type_combo.setCurrentText(self.data.get("type", "video"))
        form.addRow("Type:", self.type_combo)
        
        self.label_edit = QLineEdit(self.data.get("label", ""))
        self.label_edit.setPlaceholderText("e.g. Lesson PDF")
        form.addRow("Label:", self.label_edit)
        
        self.url_edit = QLineEdit(self.data.get("url", ""))
        self.url_edit.setPlaceholderText("https://...")
        form.addRow("URL:", self.url_edit)
        
        layout.addLayout(form)
        
        btns = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

    def get_data(self):
        t = self.type_combo.currentText()
        l = self.label_edit.text().strip()
        if not l: l = t.capitalize()
        return {"type": t, "label": l, "url": self.url_edit.text().strip()}


# ─────────────────────────────────────────────
#  Right Panel: context-sensitive editor
# ─────────────────────────────────────────────

class EditorPanel(QScrollArea):
    """Right-side panel showing details of the selected item."""

    request_refresh = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self._container = QWidget()
        self._layout = QVBoxLayout(self._container)
        self._layout.setAlignment(Qt.AlignTop)
        self._layout.setSpacing(10)
        self._layout.setContentsMargins(16, 16, 16, 16)
        self.setWidget(self._container)
        self.setStyleSheet("QScrollArea { background: transparent; border: none; }")
        self._templates = None
        self._show_welcome()

    def set_templates(self, templates):
        self._templates = templates

    def _clear(self):
        while self._layout.count():
            item = self._layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

    def _show_welcome(self):
        self._clear()
        lbl = QLabel("← Select an item from the tree to edit it")
        lbl.setStyleSheet(f"color: {COLORS['overlay']}; font-size: 14px;")
        lbl.setAlignment(Qt.AlignCenter)
        self._layout.addWidget(lbl)

    def show_template(self, tmpl_idx):
        self._clear()
        if self._templates is None:
            return
        tmpl = self._templates[tmpl_idx]

        # ── Header ──
        header = QLabel(f"📁 Template")
        header.setStyleSheet(f"color: {COLORS['accent']}; font-size: 11px; font-weight: 700; letter-spacing: 1px;")
        self._layout.addWidget(header)

        # ── Year ──
        grp = QGroupBox("Template Details")
        form = QFormLayout(grp)
        form.setSpacing(10)

        year_lbl = QLabel(tmpl.get("year", "").upper())
        year_lbl.setStyleSheet(f"color: {COLORS['accent2']}; font-weight: 700;")
        form.addRow("Year:", year_lbl)

        name_edit = QLineEdit(tmpl.get("name", ""))
        name_edit.setLayoutDirection(Qt.RightToLeft)
        form.addRow("Name:", name_edit)

        save_btn = QPushButton("💾  Save Changes")
        save_btn.setObjectName("btnAccent")

        def _save():
            new_year = tmpl.get("year", "")  # year only changeable via dialog
            tmpl["name"] = name_edit.text().strip()
            self.request_refresh.emit()

        save_btn.clicked.connect(_save)
        form.addRow("", save_btn)
        self._layout.addWidget(grp)

        # ── Stats ──
        stats = QLabel(f"📚 {len(tmpl.get('subjects', []))} subjects")
        stats.setStyleSheet(f"color: {COLORS['subtext']};")
        self._layout.addWidget(stats)

    def show_subject(self, tmpl_idx, subj_idx):
        self._clear()
        if self._templates is None:
            return
        subj = self._templates[tmpl_idx]["subjects"][subj_idx]

        header = QLabel("📖 Subject")
        header.setStyleSheet(f"color: {COLORS['accent2']}; font-size: 11px; font-weight: 700; letter-spacing: 1px;")
        self._layout.addWidget(header)

        grp = QGroupBox("Subject Details")
        form = QFormLayout(grp)
        form.setSpacing(10)

        name_edit = QLineEdit(subj.get("name", ""))
        name_edit.setLayoutDirection(Qt.RightToLeft)
        form.addRow("Name:", name_edit)

        has_ex_cb = QCheckBox("Has Exercises")
        has_ex_cb.setChecked(subj.get("has_exercises", True))
        form.addRow("", has_ex_cb)

        save_btn = QPushButton("💾  Save Changes")
        save_btn.setObjectName("btnAccent")

        def _save():
            subj["name"] = name_edit.text().strip()
            if has_ex_cb.isChecked():
                if "has_exercises" in subj:
                    del subj["has_exercises"]
            else:
                subj["has_exercises"] = False
            self.request_refresh.emit()

        save_btn.clicked.connect(_save)
        form.addRow("", save_btn)
        self._layout.addWidget(grp)

        stats = QLabel(f"📝 {len(subj.get('chapters', []))} chapters")
        stats.setStyleSheet(f"color: {COLORS['subtext']};")
        self._layout.addWidget(stats)

    def show_chapter(self, tmpl_idx, subj_idx, ch_idx):
        self._clear()
        if self._templates is None:
            return
        ch = self._templates[tmpl_idx]["subjects"][subj_idx]["chapters"][ch_idx]
        is_dict = isinstance(ch, dict)
        
        # Ensure it's a dict for resource management
        if not is_dict:
            # Convert string chapter to dict on the fly if needed
            self._templates[tmpl_idx]["subjects"][subj_idx]["chapters"][ch_idx] = {"name": ch, "url": "", "resources": []}
            ch = self._templates[tmpl_idx]["subjects"][subj_idx]["chapters"][ch_idx]
            is_dict = True

        header = QLabel("📄 Chapter")
        header.setStyleSheet(f"color: {COLORS['accent3']}; font-size: 11px; font-weight: 700; letter-spacing: 1px;")
        self._layout.addWidget(header)

        # Name Group
        grp_name = QGroupBox("General")
        form_name = QFormLayout(grp_name)
        self.name_edit = QLineEdit(ch["name"])
        self.name_edit.setLayoutDirection(Qt.RightToLeft)
        form_name.addRow("Name:", self.name_edit)
        self._layout.addWidget(grp_name)

        # Resources Group
        grp_res = QGroupBox("Resources")
        layout_res = QVBoxLayout(grp_res)
        
        self.res_list = QTreeWidget()
        self.res_list.setHeaderLabels(["Type", "Label", "URL"])
        self.res_list.setColumnWidth(0, 70)
        self.res_list.setColumnWidth(1, 120)
        self.res_list.setMinimumHeight(200)
        self.res_list.setStyleSheet(f"border: 1px solid {COLORS['border']};")
        layout_res.addWidget(self.res_list)
        
        # Local copy of resources for editing
        self.current_ch_resources = copy.deepcopy(ch.get("resources", []))
        if not self.current_ch_resources and ch.get("url"):
            self.current_ch_resources.append({"type": "video", "url": ch["url"], "label": "Video Lesson"})

        def _refresh_list():
            self.res_list.clear()
            for r in self.current_ch_resources:
                item = QTreeWidgetItem([r.get("type",""), r.get("label",""), r.get("url","")])
                self.res_list.addTopLevelItem(item)
        
        _refresh_list()

        btn_layout = QHBoxLayout()
        add_res_btn = QPushButton("➕ Add")
        
        def _add():
            dlg = ResourceDialog(self)
            if dlg.exec_() == QDialog.Accepted:
                self.current_ch_resources.append(dlg.get_data())
                _refresh_list()
        
        add_res_btn.clicked.connect(_add)
        
        del_res_btn = QPushButton("🗑 Remove")
        def _del():
            curr = self.res_list.currentItem()
            if curr:
                idx = self.res_list.indexOfTopLevelItem(curr)
                self.current_ch_resources.pop(idx)
                _refresh_list()
        del_res_btn.clicked.connect(_del)
        
        btn_layout.addWidget(add_res_btn)
        btn_layout.addWidget(del_res_btn)
        layout_res.addLayout(btn_layout)
        self._layout.addWidget(grp_res)

        # Final Save Button
        save_btn = QPushButton("💾  Save Chapter Changes")
        save_btn.setObjectName("btnAccent")
        save_btn.setMinimumHeight(40)

        def _save_all():
            subj_chapters = self._templates[tmpl_idx]["subjects"][subj_idx]["chapters"]
            subj_chapters[ch_idx]["name"] = self.name_edit.text().strip()
            subj_chapters[ch_idx]["resources"] = self.current_ch_resources
            # Sync back url for compat
            yt = next((r["url"] for r in self.current_ch_resources if r["type"] == "video"), "")
            subj_chapters[ch_idx]["url"] = yt
            
            self.request_refresh.emit()
            QMessageBox.information(self, "Success", "Chapter updated successfully!")

        save_btn.clicked.connect(_save_all)
        self._layout.addWidget(save_btn)


# ─────────────────────────────────────────────
#  Main Window
# ─────────────────────────────────────────────

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".templates_editor_config.json")

class TemplatesEditorWindow(QMainWindow):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Templates.js Editor")
        self.setMinimumSize(900, 620)
        self.resize(1100, 700)
        self._filepath = None
        self._templates = []
        self._unsaved = False

        self.setStyleSheet(STYLESHEET)
        self._build_toolbar()
        self._build_central()
        self._build_statusbar()
        self._show_empty_state()

        # Keyboard shortcuts
        QShortcut(QKeySequence("Ctrl+S"), self, self._save_file)
        QShortcut(QKeySequence("Ctrl+O"), self, self._open_file)
        QShortcut(QKeySequence("Delete"), self._tree, self._delete_selected)

    def _save_config(self):
        """Save the last opened file path to a hidden config file."""
        if self._filepath:
            try:
                with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump({"last_file": self._filepath}, f)
            except:
                pass

    def _load_config(self):
        """Try to load the last opened file path."""
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    return config.get("last_file")
            except:
                pass
        return None

    # ── Toolbar ──────────────────────────────

    def _build_toolbar(self):
        tb = QToolBar("Main Toolbar", self)
        tb.setMovable(False)
        tb.setIconSize(QSize(16, 16))
        self.addToolBar(tb)

        def tbtn(text, tip, slot):
            act = QAction(text, self)
            act.setToolTip(tip)
            act.triggered.connect(slot)
            tb.addAction(act)
            return act

        tbtn("📂  Open", "Open templates.js  (Ctrl+O)", self._open_file)
        tbtn("💾  Save", "Save file  (Ctrl+S)", self._save_file)
        tbtn("💾  Save As", "Save as new file", self._save_as_file)
        tb.addSeparator()
        tbtn("➕  Add Template", "Add a new template", self._add_template)
        tb.addSeparator()
        self._expand_act = tbtn("⬇  Expand All", "Expand all tree items", self._tree_expand_all if hasattr(self, '_tree') else lambda: None)
        self._collapse_act = tbtn("⬆  Collapse All", "Collapse all tree items", self._tree_collapse_all if hasattr(self, '_tree') else lambda: None)

    # ── Central widget ──────────────────────

    def _build_central(self):
        splitter = QSplitter(Qt.Horizontal, self)
        splitter.setHandleWidth(2)
        self.setCentralWidget(splitter)

        # Left: tree
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(8, 8, 4, 8)
        left_layout.setSpacing(6)

        search_row = QHBoxLayout()
        self._search = QLineEdit()
        self._search.setPlaceholderText("🔍  Search templates, subjects, chapters…")
        self._search.textChanged.connect(self._filter_tree)
        search_row.addWidget(self._search)
        left_layout.addLayout(search_row)

        self._tree = QTreeWidget()
        self._tree.setHeaderHidden(True)
        self._tree.setUniformRowHeights(False)
        self._tree.setDragDropMode(QAbstractItemView.InternalMove)
        self._tree.setSelectionMode(QAbstractItemView.SingleSelection)
        self._tree.itemSelectionChanged.connect(self._on_selection_changed)
        self._tree.setContextMenuPolicy(Qt.CustomContextMenu)
        self._tree.customContextMenuRequested.connect(self._context_menu)
        left_layout.addWidget(self._tree)

        # Button bar below tree
        btn_row = QHBoxLayout()
        btn_row.setSpacing(4)
        for text, tip, slot in [
            ("➕ Template", "Add template", self._add_template),
            ("➕ Subject",  "Add subject to selected template", self._add_subject),
            ("➕ Chapter",  "Add chapter to selected subject", self._add_chapter),
        ]:
            b = QPushButton(text)
            b.setToolTip(tip)
            b.clicked.connect(slot)
            b.setFixedHeight(28)
            btn_row.addWidget(b)
        left_layout.addLayout(btn_row)

        splitter.addWidget(left)

        # Right: editor panel
        self._editor = EditorPanel()
        self._editor.request_refresh.connect(self._on_refresh)
        self._editor.set_templates(self._templates)
        splitter.addWidget(self._editor)

        splitter.setSizes([380, 700])

        # Fix toolbar button lambdas after _tree exists
        self._expand_act.triggered.disconnect()
        self._expand_act.triggered.connect(self._tree_expand_all)
        self._collapse_act.triggered.disconnect()
        self._collapse_act.triggered.connect(self._tree_collapse_all)

    def _build_statusbar(self):
        self._status = QStatusBar()
        self.setStatusBar(self._status)
        self._status.showMessage("Ready — Open a templates.js file to begin")

    # ── Tree population ───────────────────────

    def _show_empty_state(self):
        self._tree.clear()
        item = QTreeWidgetItem(["No file loaded — use 📂 Open"])
        item.setForeground(0, QColor(COLORS["overlay"]))
        self._tree.addTopLevelItem(item)

    def _populate_tree(self, preserve_expansion=False):
        """Rebuild tree from self._templates."""
        # Remember expanded state
        expanded = set()
        if preserve_expansion:
            def _collect(item, path=""):
                txt = item.text(0)
                full = f"{path}/{txt}"
                if item.isExpanded():
                    expanded.add(full)
                for i in range(item.childCount()):
                    _collect(item.child(i), full)
            for i in range(self._tree.topLevelItemCount()):
                _collect(self._tree.topLevelItem(i))

        self._tree.blockSignals(True)
        self._tree.clear()

        year_colors = {
            "bac":  "#5856d6",
            "2as":  "#007aff",
            "1as":  "#00aacc",
            "l1":   "#34c759",
            "l2":   "#ff9500",
            "l3":   "#ff6b00",
            "m1":   "#af52de",
            "m2":   "#ff3b30",
        }

        for ti, tmpl in enumerate(self._templates):
            year = tmpl.get("year", "?")
            color = year_colors.get(year, COLORS["text"])
            tmpl_item = QTreeWidgetItem()
            tmpl_item.setText(0, f"  [{year.upper()}]  {tmpl.get('name','(unnamed)')}")
            tmpl_item.setForeground(0, QColor(color))
            font = QFont()
            font.setBold(True)
            tmpl_item.setFont(0, font)
            tmpl_item.setData(0, ROLE_TYPE, "template")
            tmpl_item.setData(0, ROLE_IDX, (ti,))
            self._tree.addTopLevelItem(tmpl_item)

            for si, subj in enumerate(tmpl.get("subjects", [])):
                has_ex = subj.get("has_exercises", True)
                ex_icon = "" if has_ex else " ✗"
                subj_item = QTreeWidgetItem(tmpl_item)
                subj_item.setText(0, f"  📖 {subj.get('name','')}{ex_icon}")
                subj_item.setForeground(0, QColor(COLORS["text"]))
                subj_item.setData(0, ROLE_TYPE, "subject")
                subj_item.setData(0, ROLE_IDX, (ti, si))

                for ci, ch in enumerate(subj.get("chapters", [])):
                    ch_name = ch["name"] if isinstance(ch, dict) else ch
                    url_icon = " 🔗" if isinstance(ch, dict) else ""
                    ch_item = QTreeWidgetItem(subj_item)
                    ch_item.setText(0, f"    • {ch_name}{url_icon}")
                    ch_item.setForeground(0, QColor(COLORS["subtext"]))
                    ch_item.setData(0, ROLE_TYPE, "chapter")
                    ch_item.setData(0, ROLE_IDX, (ti, si, ci))

        # Restore expansion
        if preserve_expansion and expanded:
            def _restore(item, path=""):
                txt = item.text(0)
                full = f"{path}/{txt}"
                if full in expanded:
                    item.setExpanded(True)
                for i in range(item.childCount()):
                    _restore(item.child(i), full)
            for i in range(self._tree.topLevelItemCount()):
                _restore(self._tree.topLevelItem(i))
        else:
            self._tree.expandToDepth(0)

        self._tree.blockSignals(False)
        self._update_status()

    def _tree_expand_all(self):
        self._tree.expandAll()

    def _tree_collapse_all(self):
        self._tree.collapseAll()

    # ── Selection & editing ───────────────────

    def _on_selection_changed(self):
        items = self._tree.selectedItems()
        if not items:
            return
        item = items[0]
        kind = item.data(0, ROLE_TYPE)
        idx  = item.data(0, ROLE_IDX)
        if kind == "template":
            self._editor.show_template(idx[0])
        elif kind == "subject":
            self._editor.show_subject(idx[0], idx[1])
        elif kind == "chapter":
            self._editor.show_chapter(idx[0], idx[1], idx[2])

    def _on_refresh(self):
        self._mark_unsaved()
        self._populate_tree(preserve_expansion=True)
        self._on_selection_changed()

    # ── Context menu ──────────────────────────

    def _context_menu(self, pos):
        item = self._tree.itemAt(pos)
        menu = QMenu(self)
        if item is None:
            menu.addAction("➕ Add Template", self._add_template)
        else:
            kind = item.data(0, ROLE_TYPE)
            idx  = item.data(0, ROLE_IDX)
            if kind == "template":
                menu.addAction("✏️  Edit Template", lambda: self._edit_template(idx[0]))
                menu.addAction("➕ Add Subject",    lambda: self._add_subject_to(idx[0]))
                menu.addSeparator()
                menu.addAction("⬆  Move Up",   lambda: self._move_template(idx[0], -1))
                menu.addAction("⬇  Move Down", lambda: self._move_template(idx[0],  1))
                menu.addSeparator()
                menu.addAction("🗑  Delete Template", lambda: self._delete_template(idx[0]))
            elif kind == "subject":
                menu.addAction("✏️  Edit Subject", lambda: self._edit_subject(idx[0], idx[1]))
                menu.addAction("➕ Add Chapter",   lambda: self._add_chapter_to(idx[0], idx[1]))
                menu.addSeparator()
                menu.addAction("⬆  Move Up",   lambda: self._move_subject(idx[0], idx[1], -1))
                menu.addAction("⬇  Move Down", lambda: self._move_subject(idx[0], idx[1],  1))
                menu.addSeparator()
                menu.addAction("🗑  Delete Subject", lambda: self._delete_subject(idx[0], idx[1]))
            elif kind == "chapter":
                menu.addAction("✏️  Edit Chapter", lambda: self._edit_chapter(idx[0], idx[1], idx[2]))
                menu.addSeparator()
                menu.addAction("⬆  Move Up",   lambda: self._move_chapter(idx[0], idx[1], idx[2], -1))
                menu.addAction("⬇  Move Down", lambda: self._move_chapter(idx[0], idx[1], idx[2],  1))
                menu.addSeparator()
                menu.addAction("🗑  Delete Chapter", lambda: self._delete_chapter(idx[0], idx[1], idx[2]))
        menu.exec_(self._tree.viewport().mapToGlobal(pos))

    # ── CRUD: Templates ───────────────────────

    def _add_template(self):
        dlg = TemplateDialog(self)
        if dlg.exec_() == QDialog.Accepted:
            self._templates.append(dlg.get_data())
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _edit_template(self, ti):
        dlg = TemplateDialog(self, copy.deepcopy(self._templates[ti]))
        if dlg.exec_() == QDialog.Accepted:
            d = dlg.get_data()
            self._templates[ti]["year"] = d["year"]
            self._templates[ti]["name"] = d["name"]
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _delete_template(self, ti):
        name = self._templates[ti].get("name", "")
        reply = QMessageBox.question(
            self, "Delete Template",
            f"Delete template:\n\"{name}\"?\n\nThis will also delete all its subjects and chapters.",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self._templates.pop(ti)
            self._mark_unsaved()
            self._populate_tree()
            self._editor._show_welcome()

    def _move_template(self, ti, direction):
        lst = self._templates
        ni = ti + direction
        if 0 <= ni < len(lst):
            lst[ti], lst[ni] = lst[ni], lst[ti]
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    # ── CRUD: Subjects ────────────────────────

    def _add_subject(self):
        items = self._tree.selectedItems()
        ti = None
        if items:
            kind = items[0].data(0, ROLE_TYPE)
            idx  = items[0].data(0, ROLE_IDX)
            ti = idx[0]
        if ti is None:
            QMessageBox.information(self, "Select Template", "Please select a template first.")
            return
        self._add_subject_to(ti)

    def _add_subject_to(self, ti):
        dlg = SubjectDialog(self)
        if dlg.exec_() == QDialog.Accepted:
            self._templates[ti]["subjects"].append(dlg.get_data())
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _edit_subject(self, ti, si):
        dlg = SubjectDialog(self, copy.deepcopy(self._templates[ti]["subjects"][si]))
        if dlg.exec_() == QDialog.Accepted:
            d = dlg.get_data()
            self._templates[ti]["subjects"][si]["name"] = d["name"]
            if "has_exercises" in d:
                self._templates[ti]["subjects"][si]["has_exercises"] = False
            elif "has_exercises" in self._templates[ti]["subjects"][si]:
                del self._templates[ti]["subjects"][si]["has_exercises"]
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _delete_subject(self, ti, si):
        name = self._templates[ti]["subjects"][si].get("name", "")
        reply = QMessageBox.question(
            self, "Delete Subject",
            f"Delete subject:\n\"{name}\"?\n\nThis will also delete all its chapters.",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self._templates[ti]["subjects"].pop(si)
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)
            self._editor._show_welcome()

    def _move_subject(self, ti, si, direction):
        lst = self._templates[ti]["subjects"]
        ni = si + direction
        if 0 <= ni < len(lst):
            lst[si], lst[ni] = lst[ni], lst[si]
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    # ── CRUD: Chapters ────────────────────────

    def _add_chapter(self):
        items = self._tree.selectedItems()
        ti = si = None
        if items:
            kind = items[0].data(0, ROLE_TYPE)
            idx  = items[0].data(0, ROLE_IDX)
            if kind == "subject":
                ti, si = idx[0], idx[1]
            elif kind == "chapter":
                ti, si = idx[0], idx[1]
            elif kind == "template":
                ti = idx[0]
        if ti is None or si is None:
            QMessageBox.information(self, "Select Subject", "Please select a subject first.")
            return
        self._add_chapter_to(ti, si)

    def _add_chapter_to(self, ti, si):
        chapters = self._templates[ti]["subjects"][si].get("chapters", [])
        has_url = any(isinstance(c, dict) for c in chapters)
        dlg = ChapterDialog(self, is_url_type=has_url)
        if dlg.exec_() == QDialog.Accepted:
            chapters.append(dlg.get_data())
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _edit_chapter(self, ti, si, ci):
        ch = self._templates[ti]["subjects"][si]["chapters"][ci]
        dlg = ChapterDialog(self, data=copy.deepcopy(ch))
        if dlg.exec_() == QDialog.Accepted:
            self._templates[ti]["subjects"][si]["chapters"][ci] = dlg.get_data()
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _delete_chapter(self, ti, si, ci):
        ch = self._templates[ti]["subjects"][si]["chapters"][ci]
        name = ch["name"] if isinstance(ch, dict) else ch
        reply = QMessageBox.question(
            self, "Delete Chapter",
            f"Delete chapter:\n\"{name}\"?",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self._templates[ti]["subjects"][si]["chapters"].pop(ci)
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)
            self._editor._show_welcome()

    def _move_chapter(self, ti, si, ci, direction):
        lst = self._templates[ti]["subjects"][si]["chapters"]
        ni = ci + direction
        if 0 <= ni < len(lst):
            lst[ci], lst[ni] = lst[ni], lst[ci]
            self._mark_unsaved()
            self._populate_tree(preserve_expansion=True)

    def _delete_selected(self):
        items = self._tree.selectedItems()
        if not items:
            return
        item = items[0]
        kind = item.data(0, ROLE_TYPE)
        idx  = item.data(0, ROLE_IDX)
        if kind == "template":
            self._delete_template(idx[0])
        elif kind == "subject":
            self._delete_subject(idx[0], idx[1])
        elif kind == "chapter":
            self._delete_chapter(idx[0], idx[1], idx[2])

    # ── Search / filter ───────────────────────

    def _filter_tree(self, text):
        text = text.lower().strip()

        def _set_visible(item, visible):
            item.setHidden(not visible)

        def _check(item):
            match = text in item.text(0).lower()
            child_match = False
            for i in range(item.childCount()):
                child = item.child(i)
                child_vis = _check(child)
                if child_vis:
                    child_match = True
            visible = match or child_match
            item.setHidden(not visible)
            if child_match:
                item.setExpanded(True)
            return visible

        for i in range(self._tree.topLevelItemCount()):
            _check(self._tree.topLevelItem(i))

    # ── File I/O ──────────────────────────────

    def _open_file(self):
        last_file = self._load_config()
        initial_dir = os.path.dirname(last_file) if last_file and os.path.exists(last_file) else ""
        
        path, _ = QFileDialog.getOpenFileName(
            self, "Open templates.js", initial_dir, "JavaScript Files (*.js);;All Files (*)"
        )
        if not path:
            return
        try:
            self._templates = parse_js_file(path)
            self._filepath = path
            self._unsaved = False
            self._editor.set_templates(self._templates)
            self._populate_tree()
            self._editor._show_welcome()
            self._status.showMessage(f"Loaded: {path}  —  {len(self._templates)} templates")
            self.setWindowTitle(f"Templates.js Editor — {path}")
            self._save_config()
        except Exception as e:
            QMessageBox.critical(self, "Parse Error", f"Could not parse file:\n{e}")

    def _save_file(self):
        if not self._filepath:
            self._save_as_file()
            return
        try:
            write_js_file(self._filepath, self._templates)
            self._unsaved = False
            self._status.showMessage(f"✅ Saved: {self._filepath}")
            self.setWindowTitle(f"Templates.js Editor — {self._filepath}")
            self._save_config()
        except Exception as e:
            QMessageBox.critical(self, "Save Error", f"Could not save file:\n{e}")

    def _save_as_file(self):
        path, _ = QFileDialog.getSaveFileName(
            self, "Save As", "templates.js", "JavaScript Files (*.js);;All Files (*)"
        )
        if not path:
            return
        self._filepath = path
        self._save_file()

    # ── Helpers ───────────────────────────────

    def _mark_unsaved(self):
        self._unsaved = True
        title = self.windowTitle()
        if not title.startswith("*"):
            self.setWindowTitle("* " + title)

    def _update_status(self):
        if self._templates:
            total_subj = sum(len(t.get("subjects", [])) for t in self._templates)
            total_ch   = sum(
                len(s.get("chapters", []))
                for t in self._templates for s in t.get("subjects", [])
            )
            self._status.showMessage(
                f"📁 {len(self._templates)} templates  •  "
                f"📖 {total_subj} subjects  •  "
                f"📄 {total_ch} chapters"
                + (f"  —  {self._filepath}" if self._filepath else "")
            )

    def closeEvent(self, event):
        if self._unsaved:
            reply = QMessageBox.question(
                self, "Unsaved Changes",
                "You have unsaved changes. Save before closing?",
                QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel
            )
            if reply == QMessageBox.Save:
                self._save_file()
                event.accept()
            elif reply == QMessageBox.Discard:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Templates.js Editor")
    app.setStyle("Fusion")

    # Light palette
    palette = QPalette()
    palette.setColor(QPalette.Window,          QColor(COLORS["bg"]))
    palette.setColor(QPalette.WindowText,      QColor(COLORS["text"]))
    palette.setColor(QPalette.Base,            QColor(COLORS["panel"]))
    palette.setColor(QPalette.AlternateBase,   QColor(COLORS["surface"]))
    palette.setColor(QPalette.ToolTipBase,     QColor(COLORS["panel"]))
    palette.setColor(QPalette.ToolTipText,     QColor(COLORS["text"]))
    palette.setColor(QPalette.Text,            QColor(COLORS["text"]))
    palette.setColor(QPalette.Button,          QColor(COLORS["surface"]))
    palette.setColor(QPalette.ButtonText,      QColor(COLORS["text"]))
    palette.setColor(QPalette.BrightText,      QColor(COLORS["accent"]))
    palette.setColor(QPalette.Highlight,       QColor(COLORS["accent"]))
    palette.setColor(QPalette.HighlightedText, QColor("#ffffff"))
    app.setPalette(palette)

    win = TemplatesEditorWindow()
    win.show()

    # Auto-load logic
    path_to_load = None
    if len(sys.argv) > 1:
        path_to_load = sys.argv[1]
    else:
        path_to_load = win._load_config()

    if path_to_load and os.path.exists(path_to_load):
        try:
            win._templates = parse_js_file(path_to_load)
            win._filepath = path_to_load
            win._editor.set_templates(win._templates)
            win._populate_tree()
            win._editor._show_welcome()
            win._status.showMessage(f"Loaded: {path_to_load}")
            win.setWindowTitle(f"Templates.js Editor — {path_to_load}")
        except Exception as e:
            QMessageBox.critical(win, "Error", str(e))

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()