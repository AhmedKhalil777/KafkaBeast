import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { KafkaConnection } from '../../../../../models/kafka.models';

@Component({
  selector: 'app-json-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MonacoEditorModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => JsonConfigComponent),
    multi: true
  }],
  templateUrl: './json-config.component.html',
  styleUrls: ['./json-config.component.css']
})
export class JsonConfigComponent implements ControlValueAccessor, OnInit {
  @Input() connection!: KafkaConnection;
  
  jsonConfig: string = '';
  jsonEditorOptions = {
    theme: 'vs-dark',
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    formatOnPaste: true,
    formatOnType: true
  };
  
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.updateJsonFromConnection();
  }

  writeValue(value: any): void {
    if (value) {
      this.connection = value;
      this.updateJsonFromConnection();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  updateJsonFromConnection() {
    if (this.connection) {
      this.jsonConfig = JSON.stringify(this.connection, null, 2);
    }
  }

  exportToJson() {
    this.updateJsonFromConnection();
    const blob = new Blob([this.jsonConfig], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.connection.name || 'connection'}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.showSuccess('Configuration exported successfully');
  }

  copyJsonToClipboard() {
    this.updateJsonFromConnection();
    navigator.clipboard.writeText(this.jsonConfig).then(() => {
      this.showSuccess('JSON copied to clipboard');
    }).catch(() => {
      this.showError('Failed to copy to clipboard');
    });
  }

  importFromJson(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          this.jsonConfig = e.target.result;
          this.applyJsonConfig();
        } catch (error) {
          this.showError('Failed to import JSON');
        }
      };
      reader.readAsText(file);
    }
  }

  formatJson() {
    try {
      const parsed = JSON.parse(this.jsonConfig);
      this.jsonConfig = JSON.stringify(parsed, null, 2);
      this.showSuccess('JSON formatted');
    } catch (error) {
      this.showError('Invalid JSON format');
    }
  }

  applyJsonConfig() {
    try {
      const parsed = JSON.parse(this.jsonConfig);
      
      // Validate required fields
      if (!parsed.name || !parsed.bootstrapServers) {
        this.showError('JSON must contain "name" and "bootstrapServers" fields');
        return;
      }

      // Update the connection object with parsed JSON
      Object.assign(this.connection, parsed);
      
      // Notify parent of changes
      this.onChange(this.connection);
      this.showSuccess('Configuration applied successfully');
    } catch (error) {
      this.showError('Invalid JSON - cannot apply');
    }
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}
