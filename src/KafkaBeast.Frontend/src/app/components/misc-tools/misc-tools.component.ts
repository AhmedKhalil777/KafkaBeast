import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-misc-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="misc-tools-container">
      <div class="page-header">
        <mat-icon class="page-icon">build</mat-icon>
        <div class="page-title">
          <h1>Misc Tools</h1>
          <p>Utility tools for data conversion and formatting</p>
        </div>
      </div>
      
      <mat-tab-group animationDuration="200ms">
        <!-- Base64 to XML Converter -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>code</mat-icon>
            <span>Base64 ↔ XML</span>
          </ng-template>
          
          <div class="tool-panel">
            <mat-card class="editor-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>text_snippet</mat-icon>
                <mat-card-title>Base64 Input</mat-card-title>
                <mat-card-subtitle>Paste or type your Base64 encoded content</mat-card-subtitle>
                <div class="card-actions">
                  <button mat-icon-button matTooltip="Fullscreen" (click)="openFullscreen('base64Input', 'Base64 Input', 'plaintext')">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Paste from clipboard" (click)="pasteBase64()">
                    <mat-icon>content_paste</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Clear" (click)="clearBase64()">
                    <mat-icon>clear</mat-icon>
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="editor-wrapper">
                  <ngx-monaco-editor
                    [options]="base64EditorOptions"
                    [(ngModel)]="base64Input">
                  </ngx-monaco-editor>
                </div>
              </mat-card-content>
            </mat-card>
            
            <div class="action-bar">
              <button mat-raised-button color="primary" (click)="convertBase64ToXml()">
                <mat-icon>arrow_downward</mat-icon>
                Decode to XML
              </button>
              <button mat-stroked-button color="primary" (click)="convertXmlToBase64()">
                <mat-icon>arrow_upward</mat-icon>
                Encode to Base64
              </button>
            </div>
            
            <mat-card class="editor-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>data_object</mat-icon>
                <mat-card-title>XML Output</mat-card-title>
                <mat-card-subtitle>Decoded and formatted XML content</mat-card-subtitle>
                <div class="card-actions">
                  <button mat-icon-button matTooltip="Fullscreen" (click)="openFullscreen('xmlOutput', 'XML Output', 'xml')">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Format XML" (click)="formatXml()">
                    <mat-icon>auto_fix_high</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Copy to clipboard" (click)="copyXml()">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Clear" (click)="clearXml()">
                    <mat-icon>clear</mat-icon>
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="editor-wrapper">
                  <ngx-monaco-editor
                    [options]="xmlEditorOptions"
                    [(ngModel)]="xmlOutput">
                  </ngx-monaco-editor>
                </div>
              </mat-card-content>
            </mat-card>
            
            @if (errorMessage) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                {{ errorMessage }}
              </div>
            }
          </div>
        </mat-tab>
        
        <!-- JSON to Base64 Converter -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>data_object</mat-icon>
            <span>JSON ↔ Base64</span>
          </ng-template>
          
          <div class="tool-panel">
            <mat-card class="editor-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>data_object</mat-icon>
                <mat-card-title>JSON Input</mat-card-title>
                <mat-card-subtitle>Paste or type your JSON content</mat-card-subtitle>
                <div class="card-actions">
                  <button mat-icon-button matTooltip="Fullscreen" (click)="openFullscreen('jsonInput', 'JSON Input', 'json')">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Paste from clipboard" (click)="pasteJson()">
                    <mat-icon>content_paste</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Format JSON" (click)="formatJson()">
                    <mat-icon>auto_fix_high</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Clear" (click)="clearJson()">
                    <mat-icon>clear</mat-icon>
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="editor-wrapper">
                  <ngx-monaco-editor
                    [options]="jsonEditorOptions"
                    [(ngModel)]="jsonInput">
                  </ngx-monaco-editor>
                </div>
              </mat-card-content>
            </mat-card>
            
            <div class="action-bar">
              <button mat-raised-button color="primary" (click)="convertJsonToBase64()">
                <mat-icon>arrow_downward</mat-icon>
                Encode to Base64
              </button>
              <button mat-stroked-button color="primary" (click)="convertBase64ToJson()">
                <mat-icon>arrow_upward</mat-icon>
                Decode to JSON
              </button>
            </div>
            
            <mat-card class="editor-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>text_snippet</mat-icon>
                <mat-card-title>Base64 Output</mat-card-title>
                <mat-card-subtitle>Encoded Base64 content</mat-card-subtitle>
                <div class="card-actions">
                  <button mat-icon-button matTooltip="Fullscreen" (click)="openFullscreen('jsonBase64Output', 'Base64 Output', 'plaintext')">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Copy to clipboard" (click)="copyJsonBase64()">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Clear" (click)="clearJsonBase64()">
                    <mat-icon>clear</mat-icon>
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="editor-wrapper">
                  <ngx-monaco-editor
                    [options]="base64EditorOptions"
                    [(ngModel)]="jsonBase64Output">
                  </ngx-monaco-editor>
                </div>
              </mat-card-content>
            </mat-card>
            
            @if (jsonErrorMessage) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                {{ jsonErrorMessage }}
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
      
      <!-- Fullscreen Modal -->
      @if (fullscreenOpen) {
        <div class="fullscreen-overlay" (click)="closeFullscreen()">
          <div class="fullscreen-modal" (click)="$event.stopPropagation()">
            <div class="fullscreen-header">
              <h2>{{ fullscreenTitle }}</h2>
              <div class="fullscreen-header-actions">
                <button mat-icon-button matTooltip="Copy to clipboard" (click)="copyFullscreenContent()">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Close (Esc)" (click)="closeFullscreen()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
            <div class="fullscreen-editor">
              <ngx-monaco-editor
                [options]="fullscreenEditorOptions"
                [(ngModel)]="fullscreenContent"
                (ngModelChange)="onFullscreenContentChange($event)">
              </ngx-monaco-editor>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .misc-tools-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .page-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }
    
    .page-title h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
      color: #333;
    }
    
    .page-title p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }
    
    ::ng-deep .mat-mdc-tab-labels {
      gap: 8px;
    }
    
    ::ng-deep .mat-mdc-tab .mdc-tab__content {
      gap: 8px;
    }
    
    .tool-panel {
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .editor-card {
      overflow: visible;
    }
    
    .editor-card mat-card-header {
      position: relative;
      padding: 16px;
    }
    
    .editor-card mat-card-header mat-icon[mat-card-avatar] {
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 8px;
      padding: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .card-actions {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 4px;
    }
    
    ::ng-deep .editor-card mat-card-content {
      padding: 0 16px 16px 16px;
    }
    
    .editor-wrapper {
      height: 350px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .editor-wrapper ::ng-deep .editor-container {
      height: 100% !important;
    }
    
    .action-bar {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 8px 0;
    }
    
    .action-bar button {
      min-width: 160px;
    }
    
    .action-bar button mat-icon {
      margin-right: 8px;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 8px;
      color: #c62828;
      font-size: 14px;
    }
    
    .error-message mat-icon {
      color: #ef5350;
      flex-shrink: 0;
    }
    
    /* Fullscreen Modal */
    .fullscreen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    
    .fullscreen-modal {
      width: 100%;
      height: 100%;
      max-width: 1600px;
      max-height: 95vh;
      background: #1e1e1e;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    }
    
    .fullscreen-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }
    
    .fullscreen-header h2 {
      margin: 0;
      color: #fff;
      font-size: 18px;
      font-weight: 500;
    }
    
    .fullscreen-header-actions {
      display: flex;
      gap: 8px;
    }
    
    .fullscreen-header-actions button {
      color: #ccc;
    }
    
    .fullscreen-header-actions button:hover {
      color: #fff;
    }
    
    .fullscreen-editor {
      flex: 1;
      overflow: hidden;
    }
    
    .fullscreen-editor ::ng-deep .editor-container {
      height: 100% !important;
    }
  `]
})
export class MiscToolsComponent {
  // Base64 to XML
  base64Input = '';
  xmlOutput = '';
  errorMessage = '';
  
  // JSON to Base64
  jsonInput = '';
  jsonBase64Output = '';
  jsonErrorMessage = '';
  
  // Fullscreen state
  fullscreenOpen = false;
  fullscreenTitle = '';
  fullscreenContent = '';
  fullscreenField = '';
  fullscreenEditorOptions: any = {};
  
  base64EditorOptions = {
    theme: 'vs-dark',
    language: 'plaintext',
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false
  };
  
  xmlEditorOptions = {
    theme: 'vs-dark',
    language: 'xml',
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    readOnly: false
  };
  
  jsonEditorOptions = {
    theme: 'vs-dark',
    language: 'json',
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    formatOnPaste: true,
    formatOnType: true
  };
  
  constructor(private snackBar: MatSnackBar) {}
  
  // Base64 to XML methods
  convertBase64ToXml(): void {
    this.errorMessage = '';
    try {
      const decoded = atob(this.base64Input.trim());
      this.xmlOutput = decoded;
      this.formatXml();
    } catch (e) {
      this.errorMessage = 'Invalid Base64 input. Please check your input and try again.';
    }
  }
  
  convertXmlToBase64(): void {
    this.errorMessage = '';
    try {
      const encoded = btoa(this.xmlOutput);
      this.base64Input = encoded;
    } catch (e) {
      this.errorMessage = 'Failed to encode XML to Base64.';
    }
  }
  
  formatXml(): void {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(this.xmlOutput, 'application/xml');
      const errorNode = xmlDoc.querySelector('parsererror');
      if (errorNode) {
        this.errorMessage = 'Invalid XML format';
        return;
      }
      
      const serializer = new XMLSerializer();
      const xmlString = serializer.serializeToString(xmlDoc);
      this.xmlOutput = this.prettyPrintXml(xmlString);
    } catch (e) {
      this.errorMessage = 'Failed to format XML';
    }
  }
  
  private prettyPrintXml(xml: string): string {
    const PADDING = '  ';
    let formatted = '';
    let pad = 0;
    
    xml = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
    
    xml.split('\n').forEach((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
        indent = 1;
      }
      
      formatted += PADDING.repeat(pad) + node + '\n';
      pad += indent;
    });
    
    return formatted.trim();
  }
  
  async pasteBase64(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.base64Input = text;
    } catch (e) {
      this.snackBar.open('Failed to read clipboard', 'Close', { duration: 2000 });
    }
  }
  
  clearBase64(): void {
    this.base64Input = '';
    this.errorMessage = '';
  }
  
  async copyXml(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.xmlOutput);
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Failed to copy', 'Close', { duration: 2000 });
    }
  }
  
  clearXml(): void {
    this.xmlOutput = '';
    this.errorMessage = '';
  }
  
  // JSON to Base64 methods
  convertJsonToBase64(): void {
    this.jsonErrorMessage = '';
    try {
      JSON.parse(this.jsonInput); // Validate JSON
      const encoded = btoa(this.jsonInput);
      this.jsonBase64Output = encoded;
    } catch (e) {
      this.jsonErrorMessage = 'Invalid JSON input. Please check your input and try again.';
    }
  }
  
  convertBase64ToJson(): void {
    this.jsonErrorMessage = '';
    try {
      const decoded = atob(this.jsonBase64Output.trim());
      const parsed = JSON.parse(decoded);
      this.jsonInput = JSON.stringify(parsed, null, 2);
    } catch (e) {
      this.jsonErrorMessage = 'Invalid Base64 or resulting content is not valid JSON.';
    }
  }
  
  formatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonInput);
      this.jsonInput = JSON.stringify(parsed, null, 2);
    } catch (e) {
      this.jsonErrorMessage = 'Invalid JSON format';
    }
  }
  
  async pasteJson(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.jsonInput = text;
    } catch (e) {
      this.snackBar.open('Failed to read clipboard', 'Close', { duration: 2000 });
    }
  }
  
  clearJson(): void {
    this.jsonInput = '';
    this.jsonErrorMessage = '';
  }
  
  async copyJsonBase64(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonBase64Output);
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Failed to copy', 'Close', { duration: 2000 });
    }
  }
  
  clearJsonBase64(): void {
    this.jsonBase64Output = '';
    this.jsonErrorMessage = '';
  }
  
  // Fullscreen methods
  openFullscreen(field: string, title: string, language: string): void {
    this.fullscreenField = field;
    this.fullscreenTitle = title;
    this.fullscreenContent = (this as any)[field];
    this.fullscreenEditorOptions = {
      theme: 'vs-dark',
      language: language,
      minimap: { enabled: true },
      automaticLayout: true,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on'
    };
    this.fullscreenOpen = true;
    
    // Add keyboard listener for Escape
    document.addEventListener('keydown', this.handleEscKey);
  }
  
  closeFullscreen(): void {
    this.fullscreenOpen = false;
    document.removeEventListener('keydown', this.handleEscKey);
  }
  
  private handleEscKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.closeFullscreen();
    }
  };
  
  onFullscreenContentChange(content: string): void {
    (this as any)[this.fullscreenField] = content;
  }
  
  async copyFullscreenContent(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.fullscreenContent);
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Failed to copy', 'Close', { duration: 2000 });
    }
  }
}
