import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { KafkaConnection } from '../../../models/kafka.models';
import { BasicSettingsComponent } from './tabs/basic-settings/basic-settings.component';
import { SecuritySettingsComponent } from './tabs/security-settings/security-settings.component';
import { AdvancedSettingsComponent } from './tabs/advanced-settings/advanced-settings.component';
import { JsonConfigComponent } from './tabs/json-config/json-config.component';

@Component({
  selector: 'app-connection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    BasicSettingsComponent,
    SecuritySettingsComponent,
    AdvancedSettingsComponent,
    JsonConfigComponent
  ],
  templateUrl: './connection-dialog.component.html',
  styleUrls: ['./connection-dialog.component.css']
})
export class ConnectionDialogComponent implements OnChanges {
  @Input() connection!: KafkaConnection;
  @Input() isEditing = false;
  @Output() save = new EventEmitter<KafkaConnection>();
  @Output() cancel = new EventEmitter<void>();

  localConnection!: KafkaConnection;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['connection'] && this.connection) {
      this.localConnection = { ...this.connection };
    }
  }

  onSave() {
    this.save.emit(this.localConnection);
  }

  onCancel() {
    this.cancel.emit();
  }
}
