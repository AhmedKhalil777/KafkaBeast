import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <app-sidebar>
      <div class="content-wrapper">
        <router-outlet></router-outlet>
      </div>
    </app-sidebar>
  `,
  styles: [`
    .content-wrapper {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {
  title = 'Kafka Beast';
}

