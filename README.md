# Hotleno - Hotel Booking Platform

A modern, full-stack hotel booking application built with Next.js 16, featuring real-time hotel search, booking management, and an intuitive admin dashboard.

## 🌟 Overview

Hotleno is a comprehensive hotel booking platform that connects travelers with hotels worldwide through integration with the Travellanda API. The platform supports multiple languages (English and Arabic), offers a seamless booking experience, and includes powerful admin tools for business management.

### Key Highlights

- **Real-time Hotel Search**: Search and filter hotels across multiple cities and countries
- **Secure Booking System**: Complete booking flow with authentication and payment processing
- **Multi-language Support**: Full internationalization with English and Arabic
- **Admin Dashboard**: Comprehensive analytics and booking management
- **Mobile-Responsive**: Fully responsive design for all devices
- **Modern UI/UX**: Built with shadcn/ui components for professional appearance

## 🚀 Features

### For Travelers

#### Hotel Search & Discovery
- **Advanced Search**: Search hotels by city with check-in/check-out dates
- **Guest Configuration**: Support for multiple rooms, adults, and children with age specifications
- **Price Filtering**: Filter by price range, star rating, amenities, and meal plans
- **Sorting Options**: Sort by price, rating, and recommendations
- **Real-time Availability**: Live hotel availability from Travellanda API
- **30-minute Search Cache**: Search results cached for 30 minutes with expiration warnings

#### Hotel Details
- **Comprehensive Information**: Detailed hotel descriptions, amenities, and facilities
- **Image Gallery**: High-quality hotel images with lightbox viewer
- **Room Selection**: Multiple room types and board options
- **Pricing Transparency**: Clear breakdown of room rates, taxes, and total costs
- **Cancellation Policies**: Display of free cancellation deadlines and policies

#### Booking Process
1. **Search** → Find hotels based on criteria
2. **Select** → Choose room type and view details
3. **Review** → Review booking details and pricing
4. **Checkout** → Enter traveler information and contact details
5. **Confirmation** → Receive booking reference and confirmation

#### User Features
- **User Authentication**: Secure login and registration system
- **Booking History**: View past and upcoming bookings
- **Profile Management**: Update personal information and preferences
- **Support Tickets**: Create and track support requests

### For Administrators

#### Dashboard Analytics
- **Real-time Statistics**: Total bookings, users, and revenue
- **Booking Overview**: Recent bookings with status indicators
- **Performance Metrics**: Conversion rates and booking trends
- **Status Tracking**: Monitor bookings by status (confirmed, pending, cancelled)

#### Management Tools
- **Booking Management**: View and manage all bookings
- **User Management**: Manage registered users and their roles
- **Support Tickets**: Handle customer support requests
- **Revenue Tracking**: Monitor total revenue and financial metrics

## 🏗️ Technical Architecture

### Frontend

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS v4 with custom theming
- **UI Components**: shadcn/ui component library
- **Icons**: Hugeicons React for consistent iconography
- **Internationalization**: next-intl for multi-language support
- **State Management**: React hooks with local storage persistence

### Backend

- **API Routes**: Next.js API Routes with TypeScript
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **External API**: Travellanda API for hotel data and booking
- **Middleware**: Custom middleware for internationalization and authentication

### Key Libraries

```json
{
  "next": "16.0.10",
  "react": "19.2.1",
  "typescript": "^5",
  "tailwindcss": "^4",
  "mongoose": "^8.23.0",
  "next-intl": "^4.6.0",
  "jsonwebtoken": "^9.0.3",
  "bcryptjs": "^2.4.3"
}
```

## 📁 Project Structure

```
hotleno/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Internationalized routes
│   │   ├── page.tsx              # Home page with search
│   │   ├── results/              # Hotel search results
│   │   ├── hotel/[hotelId]/      # Hotel details page
│   │   ├── booking/              # Booking flow
│   │   ├── profile/              # User profile
│   │   ├── support/              # Support tickets
│   │   └── admin/                # Admin dashboard
│   └── api/                      # API routes
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── features/                 # Feature-specific components
│   ├── hotel/                    # Hotel-related components
│   ├── search/                   # Search components
│   ├── booking/                  # Booking components
│   ├── results/                  # Results page components
│   ├── admin/                    # Admin components
│   ├── shared/                   # Shared layout components
│   └── providers/                # Context providers
│
├── hooks/                        # Custom React hooks
│   ├── use-cities.ts
│   ├── use-countries.ts
│   ├── use-hotel-details.ts
│   ├── use-hotels-enhanced.ts
│   ├── use-travellanda.ts
│   └── index.ts                  # Barrel exports
│
├── lib/                          # Utilities and configurations
│   ├── api/                      # API clients
│   ├── auth/                     # Authentication utilities
│   ├── db/                       # Database connection
│   ├── utils/                    # Helper functions
│   └── config/                   # Configuration files
│
├── types/                        # TypeScript type definitions
│   ├── travellanda.ts            # API types
│   ├── state.ts                  # State types
│   └── index.ts                  # Barrel exports
│
├── models/                       # MongoDB models
│   ├── User.ts
│   ├── Booking.ts
│   └── SupportTicket.ts
│
├── messages/                     # i18n translation files
│   ├── en.json                   # English translations
│   └── ar.json                   # Arabic translations
│
├── public/                       # Static assets
└── proxy.ts                      # Next.js middleware (i18n)
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Travellanda API Configuration
NEXT_PUBLIC_TRAVELLANDA_API_URL=http://xmldemo.travellanda.com/apiv2
TRAVELLANDA_USERNAME=your_travellanda_username
TRAVELLANDA_PASSWORD=your_travellanda_password

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Next.js Configuration
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_LOCALES=en,ar
```

### Important Notes

- **Travellanda API**: Requires valid credentials from Travellanda
- **MongoDB**: Requires MongoDB Atlas cluster or local MongoDB instance
- **JWT Secret**: Should be a long, random string for production
- **Environment Security**: Never commit `.env.local` to version control

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- MongoDB instance (local or Atlas)
- Travellanda API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotleno
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 Data Flow

### Hotel Search Flow

1. User enters search criteria (city, dates, guests)
2. Frontend validates and stores search parameters
3. API request sent to Travellanda for hotel availability
4. Results cached for 30 minutes to improve performance
5. User can filter and sort results
6. Clicking a hotel navigates to detail page

### Booking Flow

1. User selects room type and views pricing
2. Reviews booking details
3. Enters traveler information (names, contact details)
4. Submits booking to Travellanda API
5. Booking stored in local MongoDB database
6. User receives confirmation with booking reference

### Admin Operations

1. Admin logs in with elevated privileges
2. Dashboard displays real-time statistics
3. Can view all bookings, users, and support tickets
4. Analytics updated on page load

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Zod schema validation for form inputs
- **API Protection**: Protected routes with middleware
- **CSRF Protection**: Built-in Next.js security features
- **Environment Variables**: Sensitive data kept out of source code

## 🌍 Internationalization

The application supports multiple languages:

- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support

Language files are located in `messages/` directory and can be extended for additional languages.

### Adding a New Language

1. Create new translation file: `messages/[lang].json`
2. Add locale to `NEXT_PUBLIC_LOCALES` in `.env.local`
3. Update `i18n/routing.ts` configuration

## 🧪 Testing

### Running Tests

```bash
# Run ESLint
npm run lint

# Build application (catches TypeScript errors)
npm run build
```

### API Testing

Test endpoints available at:
- `/api/test/travellanda` - Test Travellanda API connection
- `/api/test/db` - Test database connection

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The application can be deployed to any platform supporting Node.js:

- **Railway**: Connect GitHub repo and set environment variables
- **Render**: Web service with build command `npm run build`
- **AWS/GCP/Azure**: Container deployment with Node.js runtime

### Production Checklist

- [ ] Update `JWT_SECRET` with production value
- [ ] Configure production MongoDB URI
- [ ] Set up production Travellanda credentials
- [ ] Enable HTTPS
- [ ] Configure custom domain
- [ ] Set up monitoring and logging
- [ ] Enable error tracking (Sentry, etc.)

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🛠️ Troubleshooting

### Common Issues

**Build fails with module not found**
- Run `npm install` to ensure all dependencies are installed
- Check that all imports use correct kebab-case naming

**Database connection errors**
- Verify `MONGODB_URI` in `.env.local`
- Check network access to MongoDB Atlas
- Whitelist IP address in MongoDB Atlas

**API authentication errors**
- Verify Travellanda credentials in `.env.local`
- Check API endpoint URL is correct
- Ensure credentials are not expired

**Search results not loading**
- Check browser console for API errors
- Verify Travellanda API is accessible
- Check for CORS issues in development

## 📞 Support

For technical support or questions:

1. Check the troubleshooting section above
2. Review the API documentation in `travellanda-api-docs/`
3. Contact your development team

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 🏢 Business Information

**Platform**: Hotleno Hotel Booking Platform
**Version**: 0.1.0
**Last Updated**: April 2025
**Technology Stack**: Next.js 16, React 19, TypeScript, MongoDB, Tailwind CSS

---

## 👨‍💻 Development Team

For development inquiries or feature requests, please contact the development team.

**Note**: This README is for client delivery. Technical documentation for developers is available separately.

---

*Built with ❤️ using Next.js, React, and modern web technologies.*
