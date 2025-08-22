# NoxtmStudio - Full-Stack Web Application

A modern full-stack web application built with React, Node.js, TypeScript, and MongoDB.

## 🚀 Features

- **Authentication System**: JWT-based authentication with refresh tokens
- **User Management**: User registration, login, and profile management
- **Project Management**: Create, view, and manage projects
- **Modern UI**: Responsive design with Tailwind CSS
- **JavaScript**: Modern ES6+ syntax across frontend and backend
- **Production Ready**: Optimized for deployment

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **JavaScript** with modern ES6+ syntax
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **React 18** with JavaScript
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Custom CSS** for styling
- **Lucide React** for icons

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd noxtmstudio
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/noxtmstudio?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=https://your-backend-domain.com/api
```

## 🚀 Production Deployment

### Backend Deployment (Node.js)

1. **Start the backend**
   ```bash
   cd backend
   npm start
   ```

2. **Deploy to your preferred platform**:
   - **Heroku**: Use the provided `Procfile`
   - **Vercel**: Configure for Node.js
   - **Railway**: Connect your repository
   - **DigitalOcean App Platform**: Deploy as Node.js app

3. **Set environment variables** in your deployment platform

### Frontend Deployment (React)

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to your preferred platform**:
   - **Vercel**: Connect your repository
   - **Netlify**: Drag and drop the `build` folder
   - **GitHub Pages**: Use GitHub Actions
   - **AWS S3 + CloudFront**: For static hosting

### Database Setup

1. **MongoDB Atlas** (Recommended for production):
   - Create a free cluster
   - Get your connection string
   - Update `MONGODB_URI` in your environment variables

2. **Local MongoDB** (Development only):
   - Install MongoDB locally
   - Use `mongodb://localhost:27017/noxtmstudio`

## 📁 Project Structure

```
noxtmstudio/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── App.tsx          # Main app component
│   ├── package.json
│   └── index.css            # Custom CSS styles
├── package.json             # Root package.json
└── README.md
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: express-validator for request validation
- **CORS Protection**: Configured for production domains
- **Helmet**: Security headers middleware
- **Rate Limiting**: Built-in protection against abuse

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user profile

### Projects
- `GET /api/projects` - Get all public projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## 🚀 Available Scripts

### Root
- `npm run dev` - Start both frontend and backend in development
- `npm run install-all` - Install dependencies for all packages
- `npm run build` - Build frontend for production

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your environment details and error messages

## 🔄 Updates

To update the application:

1. Pull the latest changes
2. Update dependencies: `npm run install-all`
3. Test locally: `npm run dev`
4. Deploy to production

---

**Happy Coding! 🎉**
