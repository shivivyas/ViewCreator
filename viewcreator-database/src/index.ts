// Core database connection and helper exports
export {
  pool,
  query,
  transaction,
  checkConnection,
  closePool,
} from './db.js';

// User repository and types
export {
  User,
  UserRepository,
} from './repositories/user-repository.js';

// Template repository and types
export {
  Template,
  TemplateRepository,
} from './repositories/template-repository.js';

// Vote repository and types (upvote only)
export {
  TemplateWithVotes,
  VoteRepository,
} from './repositories/vote-repository.js';
