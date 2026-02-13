import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EditorComponent } from 'ngx-monaco-editor-v2';

export interface MessageViewerData {
  key?: string;
  value: string;
  partition: number;
  offset: number;
  timestamp: Date;
  headers?: { [key: string]: string };
}

export interface XmlNode {
  type: 'element' | 'text' | 'comment' | 'cdata';
  name?: string;
  attributes?: { [key: string]: string };
  children?: XmlNode[];
  value?: string;
  path: string;
}

@Component({
  selector: 'app-message-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    EditorComponent
  ],
  templateUrl: './message-viewer.component.html',
  styleUrls: ['./message-viewer.component.css']
})
export class MessageViewerComponent implements OnChanges {
  @Input() message: MessageViewerData | null = null;
  @Input() transformExpression = '';
  @Input() transformApplied = false;
  @Input() transformError = '';
  @Output() contentCopied = new EventEmitter<string>();

  previewType: 'key' | 'value' = 'value';
  previewContent = '';

  // Monaco Editor options for XML
  xmlEditorOptions = {
    theme: 'vs-dark',
    language: 'xml',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: true },
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    lineNumbers: 'on' as const,
    folding: true,
    foldingStrategy: 'indentation' as const,
    renderLineHighlight: 'all' as const,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  };
  previewMode: 'text' | 'json' | 'xml' | 'tree' = 'text';
  parsedJson: any = null;
  parsedXml: XmlNode | null = null;
  expandedNodes: Set<string> = new Set(['root']);
  expandedXmlNodes: Set<string> = new Set(['xml-root']);
  
  // Monaco XML editor content
  formattedXmlContent = '';
  
  // XML Outline + Detail view state
  selectedXmlNode: XmlNode | null = null;
  xmlBreadcrumb: XmlNode[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['message'] || changes['transformExpression'] || changes['transformApplied']) {
      this.updateContent();
    }
  }

  private updateContent() {
    if (!this.message) {
      this.previewContent = '';
      this.parsedJson = null;
      return;
    }

    this.previewContent = this.previewType === 'key' 
      ? (this.message.key || '') 
      : this.message.value;

    this.expandedNodes = new Set(['root']);
    
    if (this.isValidJson(this.previewContent)) {
      this.previewMode = 'json';
      this.parsedJson = JSON.parse(this.previewContent);
      this.parsedXml = null;
      this.formattedXmlContent = '';
    } else if (this.isValidXml(this.previewContent)) {
      this.previewMode = 'xml';
      this.parsedJson = null;
      this.parsedXml = this.parseXml(this.previewContent);
      this.expandedXmlNodes = new Set(['xml-root']);
      this.formattedXmlContent = this.formatXml();
    } else {
      this.previewMode = 'text';
      this.parsedJson = null;
      this.parsedXml = null;
      this.formattedXmlContent = '';
    }
  }

  // Format XML with proper indentation
  formatXml(): string {
    if (!this.previewContent) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(this.previewContent, 'application/xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) return this.previewContent;
      
      const serializer = new XMLSerializer();
      let xml = serializer.serializeToString(doc);
      
      // Format with indentation
      let formatted = '';
      let indent = '';
      const tab = '  ';
      
      xml.split(/>\s*</).forEach((node, index) => {
        if (node.match(/^\/\w/)) {
          indent = indent.substring(tab.length);
        }
        formatted += index > 0 ? indent + '<' + node + '>\n' : node + '>\n';
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('?')) {
          indent += tab;
        }
      });
      
      return formatted.substring(0, formatted.length - 1).replace(/>\n$/, '>');
    } catch {
      return this.previewContent;
    }
  }

  formatAndSetXml() {
    this.formattedXmlContent = this.formatXml();
  }

  switchPreviewType(type: 'key' | 'value') {
    this.previewType = type;
    this.updateContent();
  }

  getHeaderKeys(headers: { [key: string]: string }): string[] {
    return Object.keys(headers);
  }

  isValidJson(str: string): boolean {
    if (!str) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  isValidXml(str: string): boolean {
    if (!str) return false;
    const trimmed = str.trim();
    return trimmed.startsWith('<') && trimmed.endsWith('>');
  }

  highlightJson(json: string): SafeHtml {
    try {
      const obj = JSON.parse(json);
      const formatted = JSON.stringify(obj, null, 2);
      const highlighted = formatted
        .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
        .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
        .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: (null)/g, ': <span class="json-null">$1</span>');
      return this.sanitizer.bypassSecurityTrustHtml(highlighted);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(json);
    }
  }

  // XML Tree Parsing and Navigation
  parseXml(xmlString: string): XmlNode | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'application/xml');
      
      const parseError = doc.querySelector('parsererror');
      if (parseError) return null;
      
      return this.convertDomToXmlNode(doc.documentElement, 'xml-root');
    } catch {
      return null;
    }
  }

  private convertDomToXmlNode(element: Element, path: string): XmlNode {
    const attributes: { [key: string]: string } = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    const children: XmlNode[] = [];
    let childIndex = 0;
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      const childPath = `${path}.${childIndex}`;
      
      if (child.nodeType === Node.ELEMENT_NODE) {
        children.push(this.convertDomToXmlNode(child as Element, childPath));
        childIndex++;
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          children.push({ type: 'text', value: text, path: childPath });
          childIndex++;
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        children.push({ type: 'comment', value: child.textContent || '', path: childPath });
        childIndex++;
      } else if (child.nodeType === Node.CDATA_SECTION_NODE) {
        children.push({ type: 'cdata', value: child.textContent || '', path: childPath });
        childIndex++;
      }
    }

    return {
      type: 'element',
      name: element.tagName,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      children: children.length > 0 ? children : undefined,
      path
    };
  }

  toggleXmlNode(path: string) {
    if (this.expandedXmlNodes.has(path)) {
      this.expandedXmlNodes.delete(path);
    } else {
      this.expandedXmlNodes.add(path);
    }
  }

  isXmlNodeExpanded(path: string): boolean {
    return this.expandedXmlNodes.has(path);
  }

  hasXmlChildren(node: XmlNode): boolean {
    return node.type === 'element' && !!node.children && node.children.length > 0;
  }

  getXmlAttributeKeys(node: XmlNode): string[] {
    return node.attributes ? Object.keys(node.attributes) : [];
  }

  expandAllXml() {
    if (this.parsedXml) {
      this.expandAllXmlNodes(this.parsedXml);
    }
  }

  private expandAllXmlNodes(node: XmlNode) {
    if (node.type === 'element') {
      this.expandedXmlNodes.add(node.path);
      if (node.children) {
        for (const child of node.children) {
          this.expandAllXmlNodes(child);
        }
      }
    }
  }

  collapseAllXml() {
    this.expandedXmlNodes.clear();
    this.expandedXmlNodes.add('xml-root');
  }

  getXmlNodeSummary(node: XmlNode): string {
    if (!node.children) return '';
    const elements = node.children.filter(c => c.type === 'element').length;
    const texts = node.children.filter(c => c.type === 'text').length;
    const parts: string[] = [];
    if (elements > 0) parts.push(`${elements} element${elements > 1 ? 's' : ''}`);
    if (texts > 0) parts.push(`${texts} text`);
    return parts.join(', ');
  }

  getInlineTextContent(node: XmlNode): string | null {
    if (!node.children || node.children.length !== 1) return null;
    const child = node.children[0];
    if (child.type === 'text' && child.value && child.value.length < 60) {
      return child.value;
    }
    return null;
  }

  // XML Outline + Detail Selection
  selectXmlNode(node: XmlNode) {
    this.selectedXmlNode = node;
    this.buildXmlBreadcrumb(node);
    // Auto-expand to this node
    this.expandedXmlNodes.add(node.path);
  }

  private buildXmlBreadcrumb(node: XmlNode) {
    this.xmlBreadcrumb = [];
    if (!this.parsedXml) return;
    
    const pathParts = node.path.split('.');
    let current: XmlNode | undefined = this.parsedXml;
    
    for (let i = 0; i < pathParts.length && current; i++) {
      this.xmlBreadcrumb.push(current);
      if (current.children && i < pathParts.length - 1) {
        const nextIndex = parseInt(pathParts[i + 1], 10);
        if (!isNaN(nextIndex)) {
          current = current.children[nextIndex];
        } else {
          break;
        }
      }
    }
  }

  isXmlNodeSelected(node: XmlNode): boolean {
    return this.selectedXmlNode?.path === node.path;
  }

  getXmlElementIcon(node: XmlNode): string {
    if (!node.children || node.children.length === 0) return 'label';
    const hasElements = node.children.some(c => c.type === 'element');
    return hasElements ? 'folder' : 'article';
  }

  getXmlTextContent(node: XmlNode): string {
    if (!node.children) return '';
    return node.children
      .filter(c => c.type === 'text')
      .map(c => c.value || '')
      .join('');
  }

  getXmlElementChildren(node: XmlNode): XmlNode[] {
    if (!node.children) return [];
    return node.children.filter(c => c.type === 'element');
  }

  getXmlPath(node: XmlNode): string {
    const pathParts = node.path.split('.');
    if (this.parsedXml && pathParts.length > 1) {
      const parts: string[] = [];
      let current: XmlNode | undefined = this.parsedXml;
      for (let i = 1; i < pathParts.length && current; i++) {
        if (current.name) parts.push(current.name);
        if (current.children) {
          const idx = parseInt(pathParts[i], 10);
          if (!isNaN(idx)) current = current.children[idx];
        }
      }
      if (current?.name) parts.push(current.name);
      return '/' + parts.join('/');
    }
    return node.name ? '/' + node.name : '/';
  }

  copyXmlNodeContent(node: XmlNode) {
    let content = '';
    if (node.type === 'element') {
      content = this.serializeXmlNode(node);
    } else {
      content = node.value || '';
    }
    this.copyToClipboard(content);
  }

  private serializeXmlNode(node: XmlNode, indent = 0): string {
    const prefix = '  '.repeat(indent);
    if (node.type === 'text') return node.value || '';
    if (node.type === 'comment') return `${prefix}<!-- ${node.value} -->`;
    if (node.type === 'cdata') return `${prefix}<![CDATA[${node.value}]]>`;
    
    let attrs = '';
    if (node.attributes) {
      attrs = Object.entries(node.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('');
    }
    
    if (!node.children || node.children.length === 0) {
      return `${prefix}<${node.name}${attrs} />`;
    }
    
    const hasElementChildren = node.children.some(c => c.type === 'element');
    if (!hasElementChildren && node.children.length === 1 && node.children[0].type === 'text') {
      return `${prefix}<${node.name}${attrs}>${node.children[0].value}</${node.name}>`;
    }
    
    const childrenStr = node.children
      .map(c => this.serializeXmlNode(c, indent + 1))
      .join('\n');
    return `${prefix}<${node.name}${attrs}>\n${childrenStr}\n${prefix}</${node.name}>`;
  }

  copyToClipboard(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      this.snackBar.open('Copied to clipboard', 'Close', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      this.contentCopied.emit(content);
    });
  }

  // Tree navigation methods
  toggleNode(path: string) {
    if (this.expandedNodes.has(path)) {
      this.expandedNodes.delete(path);
    } else {
      this.expandedNodes.add(path);
    }
  }

  isNodeExpanded(path: string): boolean {
    return this.expandedNodes.has(path);
  }

  getNodePath(parentPath: string, key: string): string {
    return parentPath ? `${parentPath}.${key}` : key;
  }

  expandAll() {
    this.expandAllNodes(this.parsedJson, 'root');
  }

  private expandAllNodes(node: any, path: string) {
    if (this.isExpandable(node)) {
      this.expandedNodes.add(path);
      const entries = this.getObjectEntries(node);
      for (const entry of entries) {
        this.expandAllNodes(entry.value, this.getNodePath(path, entry.key));
      }
    }
  }

  collapseAll() {
    this.expandedNodes.clear();
    this.expandedNodes.add('root');
  }

  expandAllForMode() {
    if (this.previewMode === 'tree') {
      this.expandAll();
    } else if (this.previewMode === 'xml') {
      this.expandAllXml();
    }
  }

  collapseAllForMode() {
    if (this.previewMode === 'tree') {
      this.collapseAll();
    } else if (this.previewMode === 'xml') {
      this.collapseAllXml();
    }
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isExpandable(value: any): boolean {
    return this.isObject(value) || this.isArray(value);
  }

  getObjectEntries(obj: any): { key: string; value: any }[] {
    if (Array.isArray(obj)) {
      return obj.map((value, index) => ({ key: String(index), value }));
    }
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  getValueIcon(value: any): string {
    if (value === null) return 'block';
    if (typeof value === 'string') return 'text_fields';
    if (typeof value === 'number') return 'tag';
    if (typeof value === 'boolean') return 'toggle_on';
    return 'help';
  }

  getValueClass(value: any): string {
    if (value === null) return 'value-null';
    if (typeof value === 'string') return 'value-string';
    if (typeof value === 'number') return 'value-number';
    if (typeof value === 'boolean') return 'value-boolean';
    return '';
  }

  formatTreeValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  }
}
