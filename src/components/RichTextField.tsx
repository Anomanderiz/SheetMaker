"use client";

import { useEffect, useRef } from "react";

import styles from "./RichTextField.module.css";

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const actions: Array<{ label: string; command: string; value?: string }> = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "List", command: "insertUnorderedList" },
  { label: "Quote", command: "formatBlock", value: "blockquote" },
];

export function RichTextField({ label, value, onChange }: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.toolbar}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => runCommand(action.command, action.value)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </label>
  );
}
