import React, { useEffect, useRef } from 'react';
import { Bold, Highlighter, Italic, Link, List, ListOrdered, Quote, Underline } from 'lucide-react';

const toolButton = 'p-1.5 rounded text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors';

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write the activity description…' }) {
  const editor = useRef(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value || '';
  }, [value]);

  const run = (command, commandValue = null) => {
    editor.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editor.current?.innerHTML || '');
  };
  const addLink = () => {
    const url = window.prompt('Enter the link URL');
    if (url) run('createLink', url);
  };
  const preventFocusLoss = (event) => event.preventDefault();

  return <div className="rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('bold')} className={toolButton} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('italic')} className={toolButton} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('underline')} className={toolButton} title="Underline"><Underline className="w-3.5 h-3.5" /></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('backColor', '#fef08a')} className={toolButton} title="Highlight"><Highlighter className="w-3.5 h-3.5" /></button>
      <span className="h-4 border-l border-slate-300 mx-1" />
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('insertUnorderedList')} className={toolButton} title="Bulleted list"><List className="w-3.5 h-3.5" /></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('insertOrderedList')} className={toolButton} title="Numbered list"><ListOrdered className="w-3.5 h-3.5" /></button>
      <span className="h-4 border-l border-slate-300 mx-1" />
      <button type="button" onMouseDown={preventFocusLoss} onClick={addLink} className={toolButton} title="Add link"><Link className="w-3.5 h-3.5" /></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => run('formatBlock', 'blockquote')} className={toolButton} title="Quote"><Quote className="w-3.5 h-3.5" /></button>
      <select aria-label="Text style" className="ml-1 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-600 bg-white" defaultValue="" onChange={(event) => { if (event.target.value) run('formatBlock', event.target.value); event.target.value = ''; }}>
        <option value="">Text style</option><option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option>
      </select>
    </div>
    <div ref={editor} contentEditable role="textbox" aria-multiline="true" suppressContentEditableWarning data-placeholder={placeholder} onInput={(event) => onChange(event.currentTarget.innerHTML)} className="rich-text-content min-h-48 max-h-72 overflow-y-auto px-3 py-2 text-sm text-slate-700 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400" />
  </div>;
}
