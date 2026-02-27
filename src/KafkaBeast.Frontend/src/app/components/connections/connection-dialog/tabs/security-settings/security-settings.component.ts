import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { KafkaConnection, SecurityProtocol, SaslMechanism } from '../../../../../models/kafka.models';

@Component({
  selector: 'app-security-settings',
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
    MatDividerModule
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SecuritySettingsComponent),
    multi: true
  }],
  templateUrl: './security-settings.component.html',
  styleUrls: ['./security-settings.component.css']
})
export class SecuritySettingsComponent implements ControlValueAccessor {
  @Input() connection!: KafkaConnection;
  
  SecurityProtocol = SecurityProtocol;
  SaslMechanism = SaslMechanism;
  
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value) {
      this.connection = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onValueChange() {
    this.onChange(this.connection);
  }

  isSaslEnabled(): boolean {
    return this.connection.securityProtocol === SecurityProtocol.SaslPlaintext ||
           this.connection.securityProtocol === SecurityProtocol.SaslSsl;
  }

  isSslEnabled(): boolean {
    return this.connection.securityProtocol === SecurityProtocol.Ssl ||
           this.connection.securityProtocol === SecurityProtocol.SaslSsl;
  }

  isBasicSaslAuth(): boolean {
    return this.connection.saslMechanism === SaslMechanism.Plain ||
           this.connection.saslMechanism === SaslMechanism.ScramSha256 ||
           this.connection.saslMechanism === SaslMechanism.ScramSha512;
  }

  onSecurityProtocolChange(): void {
    if (!this.isSaslEnabled()) {
      this.connection.saslMechanism = undefined;
      this.connection.saslUsername = undefined;
      this.connection.saslPassword = undefined;
      this.connection.saslOauthBearerToken = undefined;
      this.connection.saslOauthBearerTokenEndpointUrl = undefined;
      this.connection.saslKerberosServiceName = undefined;
      this.connection.saslKerberosPrincipal = undefined;
      this.connection.saslKerberosKeytab = undefined;
    }
    if (!this.isSslEnabled()) {
      this.connection.sslCaLocation = undefined;
      this.connection.sslCertificateLocation = undefined;
      this.connection.sslKeyLocation = undefined;
      this.connection.sslKeyPassword = undefined;
      this.connection.sslCaPem = undefined;
      this.connection.sslCertificatePem = undefined;
      this.connection.sslKeyPem = undefined;
    }
    this.onValueChange();
  }
}
