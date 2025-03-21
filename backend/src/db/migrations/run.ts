import { initializeDatabase } from '../../config/database';

async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Initialize the database structure
    await initializeDatabase();
    console.log('Database schema initialized successfully');
    
    // Create a migrations table to track completed migrations
    // This is a simple implementation for demonstration
    // In a production environment, you might use a more robust migration library
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations();
}

export default runMigrations;