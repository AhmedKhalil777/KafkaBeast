import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ConnectionsComponent } from './components/connections/connections.component';
import { TopicsComponent } from './components/topics/topics.component';
import { TopicDetailComponent } from './components/topic-detail/topic-detail.component';
import { ConsumerGroupsComponent } from './components/consumer-groups/consumer-groups.component';
import { MiscToolsComponent } from './components/misc-tools/misc-tools.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'connections', component: ConnectionsComponent },
  { path: 'topics', component: TopicsComponent },
  { path: 'topics/:topicName', component: TopicDetailComponent },
  { path: 'consumer-groups', component: ConsumerGroupsComponent },
  { path: 'tools', component: MiscToolsComponent },
  { path: '**', redirectTo: '' }
];


