class StyleService {
  applyStyle(style, selection) {
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const documentFragment = range.extractContents();

    const wrapper = document.createElement("span");
    switch (style) {
      case "bold":
        wrapper.style.fontWeight = "bold";
        break;
      case "italic":
        wrapper.style.fontStyle = "italic";
        break;
      case "underline":
        wrapper.style.textDecoration = "underline";
        break;
      case "midline":
        wrapper.style.textDecoration = "line-through";
        break;
    }

    wrapper.appendChild(documentFragment);
    range.insertNode(wrapper);

    document.querySelectorAll("span").forEach((span) => {
      if (!span.innerHTML.trim() && !span.hasAttributes()) span.remove();
    });
  }
}

class EditInput {
  constructor() {
    this.currentInput = null;
  }

  create(element) {
    this.removeCurrentInput();

    const text = element.textContent;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const input = document.createElement("textarea");
    input.className = "edit-input";
    input.value = text;
    input.dir = "auto";

    Object.assign(input.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${Math.max(rect.width, 200)}px`,
      minHeight: `${rect.height}px`,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      textAlign: style.textAlign,
      direction: style.direction,
      lineHeight: style.lineHeight,
      zIndex: 10000,
      background: "rgba(255, 255, 255, 0.95)",
      border: "2px solid #007bff",
      borderRadius: "4px",
      padding: "8px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      resize: "vertical",
      whiteSpace: "pre-wrap",
    });

    input.addEventListener("input", () => {
      element.textContent = input.value;
      this.resizeInput(input, element);
    });

    document.body.appendChild(input);
    input.focus();
    input.select();
    this.currentInput = input;
    this.resizeInput(input, element);

    return input;
  }

  resizeInput(input, element) {
    const tempSpan = document.createElement("span");
    Object.assign(tempSpan.style, {
      fontSize: input.style.fontSize,
      fontFamily: input.style.fontFamily,
      whiteSpace: "pre-wrap",
      visibility: "hidden",
      position: "fixed",
    });

    tempSpan.textContent = input.value || element.placeholder;
    document.body.appendChild(tempSpan);

    input.style.height = "auto";
    input.style.height = `${Math.max(tempSpan.offsetHeight + 16, 40)}px`;
    tempSpan.remove();
  }

  removeCurrentInput() {
    if (this.currentInput) {
      this.currentInput.remove();
      this.currentInput = null;
    }
  }
}

class FloatingButton {
  constructor() {
    this.container = null;
    this.mainButton = null;
    this.childButtonsContainer = null;
    this.isMenuOpen = false;
  }

  create() {
    const container = document.createElement("div");
    container.className = "floating-container";

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const mainButton = document.createElement("button");
    mainButton.className = "main-button";
    mainButton.innerHTML = "✎";
    mainButton.title = "Text Editor (Alt+E)";

    const childButtonsContainer = document.createElement("div");
    childButtonsContainer.className = "child-buttons";

    const buttons = [
      {
        icon: "✎",
        action: "edit",
        tooltip: "Edit Text (Ctrl+/)",
      },
      {
        icon: "𝐁",
        action: "bold",
        tooltip: "Bold (Ctrl+B)",
      },
      {
        icon: "𝐼",
        action: "italic",
        tooltip: "Italic (Ctrl+I)",
      },
      {
        icon: "𝐔",
        action: "underline",
        tooltip: "Underline (Ctrl+U)",
      },
      {
        icon: "𝐒",
        action: "midline",
        tooltip: "Midline (Ctrl+S)",
      },
    ];

    buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.className = "child-button";
      button.innerHTML = btn.icon;
      button.title = btn.tooltip;
      button.dataset.action = btn.action;
      childButtonsContainer.appendChild(button);
    });

    buttonContainer.appendChild(mainButton);
    buttonContainer.appendChild(childButtonsContainer);
    container.appendChild(buttonContainer);
    document.body.appendChild(container);

    this.container = container;
    this.mainButton = mainButton;
    this.childButtonsContainer = childButtonsContainer;

    return this;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.container.classList.toggle("open", this.isMenuOpen);
  }

  setActiveMode(isActive) {
    this.mainButton.classList.toggle("active-mode", isActive);
    const editButton = this.childButtonsContainer?.querySelector(
      '[data-action="edit"]'
    );
    if (editButton) {
      editButton.classList.toggle("active-mode", isActive);
    }
  }
}

class TextEditor {
  constructor() {
    this.isEditMode = false;
    this.selectedText = null;
    this.floatingButton = new FloatingButton();
    this.editInput = new EditInput();
    this.styleService = new StyleService();
    this.init();
  }

  init() {
    this.floatingButton.create();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.floatingButton.mainButton.addEventListener("click", () => {
      this.floatingButton.toggleMenu();
      if (!this.floatingButton.isMenuOpen) this.exitEditMode();
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && !e.altKey && !this.editInput.currentInput) {
        if (e.key === "b")
          this.styleService.applyStyle("bold", this.selectedText);
        if (e.key === "i")
          this.styleService.applyStyle("italic", this.selectedText);
        if (e.key === "u")
          this.styleService.applyStyle("underline", this.selectedText);
        if (e.key === "s")
          this.styleService.applyStyle("midline", this.selectedText);
        if (e.key === "/") this.toggleEditMode();
      }
    });

    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        this.selectedText = selection;
      }
    });

    this.floatingButton.childButtonsContainer.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      this.handleButtonAction(button.dataset.action, button);
    });

    document.addEventListener("click", (e) => {
      if (!this.isEditMode) return;
      if (
        !e.target.closest(".edit-input") &&
        !e.target.closest(".child-button")
      ) {
        this.editInput.removeCurrentInput();
      }
    });

    window.addEventListener("beforeunload", () => {
      this.exitEditMode();
    });
  }

  handleButtonAction(action, button) {
    if (action === "edit") {
      if (!this.floatingButton.isMenuOpen) {
        this.floatingButton.isMenuOpen = true;
        this.floatingButton.container.classList.add("open");
      }
      this.toggleEditMode();
      this.floatingButton.setActiveMode(this.isEditMode);
    } else {
      this.styleService.applyStyle(action, this.selectedText);
    }
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;

    if (this.isEditMode) {
      document.body.classList.add("edit-mode-cursor");
      this.addEditModeListeners();
    } else {
      document.body.classList.remove("edit-mode-cursor");
      this.removeEditModeListeners();
      this.editInput.removeCurrentInput();
    }

    this.floatingButton.setActiveMode(this.isEditMode);
  }

  addEditModeListeners() {
    this.editClickListener = (e) => {
      const element = e.target.closest(
        "p, div, h1, h2, h3, h4, h5, h6, span, li"
      );
      if (element && !e.target.closest(".floating-container")) {
        const input = this.editInput.create(element);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.editInput.removeCurrentInput();
            this.exitEditMode();
          } else if (e.key === "Escape") {
            this.editInput.removeCurrentInput();
            this.exitEditMode();
          }
        });
      }
    };
    document.addEventListener("click", this.editClickListener);
  }

  removeEditModeListeners() {
    if (this.editClickListener) {
      document.removeEventListener("click", this.editClickListener);
    }
  }

  exitEditMode() {
    if (!this.isEditMode) return;

    this.isEditMode = false;
    this.floatingButton.isMenuOpen = false;
    this.editInput.removeCurrentInput();
    document.body.classList.remove("edit-mode-cursor");
    this.floatingButton.container.classList.remove("open");
    this.floatingButton.setActiveMode(false);
    this.removeEditModeListeners();
  }
}

// Initialize the editor
new TextEditor();
