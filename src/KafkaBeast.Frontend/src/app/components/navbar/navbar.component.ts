import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav style="background-color: #343a40; padding: 1rem 0; margin-bottom: 2rem;">
      <div class="container" style="display: flex; align-items: center; justify-content: space-between;">
        <h1 style="color: white; margin: 0; font-size: 1.5rem;">Kafka Beast</h1>
        <ul style="display: flex; list-style: none; gap: 1.5rem; margin: 0; padding: 0;">
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" style="color: white; text-decoration: none;">Home</a></li>
          <li><a routerLink="/connections" routerLinkActive="active" style="color: white; text-decoration: none;">Connections</a></li>
          <li><a routerLink="/produce" routerLinkActive="active" style="color: white; text-decoration: none;">Produce</a></li>
          <li><a routerLink="/consume" routerLinkActive="active" style="color: white; text-decoration: none;">Consume</a></li>
        </ul>
      </div>
    </nav>
    <style>
      .active {
        font-weight: bold;
        text-decoration: underline !important;
      }
    </style>
  `
})
export class NavbarComponent {}

