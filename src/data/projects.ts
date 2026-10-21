
import rawProjects from './projects.json';
import { projectsSchema } from './project-schema';

const projects = projectsSchema.parse(rawProjects);

export default projects;
