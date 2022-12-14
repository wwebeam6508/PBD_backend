import AuthRoutes from './Auth.route.js'
import MenuRoutes from './Menu.route.js'
import ProjectManagement from './ProjectManagement.route.js'

const routes = [
  {
    path: '/auth',
    route: AuthRoutes
  },
  {
    path: '/menu',
    route: MenuRoutes
  },
  {
    path: '/projectmanagement',
    route: ProjectManagement
  }
];

export default (app) => {
  routes.forEach((route) => {
    app.use('/api' + route.path, route.route);
  });
};