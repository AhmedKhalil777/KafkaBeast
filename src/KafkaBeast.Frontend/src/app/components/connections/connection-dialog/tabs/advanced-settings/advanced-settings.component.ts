import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { KafkaConnection, CompressionType, Acks } from '../../../../../models/kafka.models';

@Component({
  selector: 'app-advanced-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AdvancedSettingsComponent),
    multi: true
  }],
  templateUrl: './advanced-settings.component.html',
  styleUrls: ['./advanced-settings.component.css']
})
export class AdvancedSettingsComponent implements ControlValueAccessor {
  @Input() connection!: KafkaConnection;
  
  configList: { key: string; value: string }[] = [];
  
  CompressionType = CompressionType;
  Acks = Acks;
  
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value) {
      this.connection = value;
      this.configList = value.additionalConfig
        ? Object.entries(value.additionalConfig).map(([key, value]) => ({ key, value: String(value) }))
        : [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onValueChange() {
    // Update additionalConfig from configList
    if (this.configList.length > 0) {
      this.connection.additionalConfig = {};
      for (const c of this.configList) {
        if (c.key) {
          this.connection.additionalConfig[c.key] = c.value;
        }
      }
    } else {
      this.connection.additionalConfig = undefined;
    }
    this.onChange(this.connection);
  }

  addConfig() {
    this.configList.push({ key: '', value: '' });
  }

  removeConfig(index: number) {
    this.configList.splice(index, 1);
    this.onValueChange();
  }
}
