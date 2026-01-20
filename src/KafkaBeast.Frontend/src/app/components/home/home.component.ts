import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="card">
      <h2>Welcome to Kafka Beast</h2>
      <p>Kafka Beast is a powerful tool for managing and interacting with Apache Kafka clusters.</p>
      <h3>Features:</h3>
      <ul>
        <li>Manage multiple Kafka connections</li>
        <li>Produce messages to topics</li>
        <li>Consume messages from topics in real-time</li>
        <li>Monitor message streams via SignalR</li>
      </ul>
    </div>
  `
})
export class HomeComponent {}

