import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ConnectionsComponent } from './components/connections/connections.component';
import { ProduceComponent } from './components/produce/produce.component';
import { ConsumeComponent } from './components/consume/consume.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'connections', component: ConnectionsComponent },
  { path: 'produce', component: ProduceComponent },
  { path: 'consume', component: ConsumeComponent },
  { path: '**', redirectTo: '' }
];

