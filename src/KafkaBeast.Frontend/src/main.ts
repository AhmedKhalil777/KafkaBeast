import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { NGX_MONACO_EDITOR_CONFIG } from 'ngx-monaco-editor-v2';

// Disable Monaco workers to avoid loading issues
(window as any).MonacoEnvironment = {
  getWorker: function () {
    return null;
  }
};

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: NGX_MONACO_EDITOR_CONFIG,
      useValue: {
        baseUrl: 'assets',
        defaultOptions: { 
          scrollBeyondLastLine: false,
          automaticLayout: true
        },
        onMonacoLoad: () => {
          // Monaco loaded successfully
          console.log('Monaco Editor loaded');
        }
      }
    }
  ]
}).catch(err => console.error(err));

