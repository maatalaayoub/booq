/**
 * OpenAPI 3.0.3 specification for the BarberBook API.
 * Serves as the single source of truth for all API contracts.
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'BarberBook API',
    version: '1.0.0',
    description:
      'Appointment booking platform for barbers, salons, mobile service providers, and job seekers. ' +
      'All timestamps are in UTC ISO-8601 format. Authentication is handled via Supabase session cookies.',
  },
  servers: [{ url: '/api', description: 'Default' }],
  tags: [
    { name: 'Booking', description: 'Slot availability, creating & managing user bookings' },
    { name: 'Business Appointments', description: 'Business-side appointment management' },
    { name: 'Business Profile', description: 'Business onboarding, details, services, schedule' },
    { name: 'Business Discovery', description: 'Public endpoints for browsing businesses' },
    { name: 'User', description: 'User profile, roles, username' },
    { name: 'Verification', description: 'Identity & business document verification' },
    { name: 'Admin', description: 'Admin-only management endpoints' },
    { name: 'Upload', description: 'File / image upload endpoints' },
  ],
  components: {
    securitySchemes: {
      supabaseSession: {
        type: 'apiKey',
        in: 'cookie',
        name: '__session',
        description: 'Supabase session cookie (set automatically after sign-in)',
      },
    },
    schemas: {
      // ── Core models ──────────────────────────────────────────
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          business_info_id: { type: 'string', format: 'uuid' },
          auth_id: { type: 'string' },
          client_name: { type: 'string' },
          client_phone: { type: 'string', nullable: true },
          client_address: { type: 'string', nullable: true },
          service: { type: 'string', description: 'Combined service name(s)' },
          price: { type: 'number', nullable: true },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
          notes: { type: 'string', nullable: true },
          previous_start_time: { type: 'string', format: 'date-time', nullable: true },
          previous_end_time: { type: 'string', format: 'date-time', nullable: true },
          rescheduled_by: { type: 'string', enum: ['client', 'business'], nullable: true },
        },
      },
      BusinessService: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          business_info_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          duration_minutes: { type: 'integer' },
          price: { type: 'number', nullable: true },
          currency: { type: 'string', default: 'MAD' },
          is_active: { type: 'boolean' },
        },
      },
      ScheduleException: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          business_info_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          type: { type: 'string' },
          date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date', nullable: true },
          start_time: { type: 'string', description: 'HH:MM:SS', nullable: true },
          end_time: { type: 'string', description: 'HH:MM:SS', nullable: true },
          is_full_day: { type: 'boolean' },
          recurring: { type: 'boolean' },
          recurring_day: { type: 'integer', nullable: true, description: '0=Sun … 6=Sat' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          auth_id: { type: 'string' },
          role: { type: 'string', enum: ['user', 'business', 'admin'] },
          username: { type: 'string', nullable: true },
          first_name: { type: 'string', nullable: true },
          last_name: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          birthday: { type: 'string', format: 'date', nullable: true },
          gender: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          profile_image_url: { type: 'string', nullable: true },
          cover_image_url: { type: 'string', nullable: true },
          cover_image_position: { type: 'number', nullable: true },
          joined_at: { type: 'string', format: 'date-time' },
        },
      },
      BusinessInfo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          business_category: { type: 'string', enum: ['business_owner', 'mobile_service', 'job_seeker'] },
          professional_type: { type: 'string' },
          service_mode: { type: 'string', enum: ['appointment', 'walkin', 'both'] },
          onboarding_completed: { type: 'boolean' },
        },
      },
      VerificationRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          identity_document_url: { type: 'string', nullable: true },
          identity_document_type: { type: 'string', nullable: true },
          identity_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          business_document_url: { type: 'string', nullable: true },
          business_document_type: { type: 'string', nullable: true },
          business_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        },
      },
      TimeSlot: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'HH:MM' },
          end: { type: 'string', description: 'HH:MM' },
          available: { type: 'boolean' },
        },
      },
      UserBookingSlot: {
        type: 'object',
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
          status: { type: 'string' },
          crossBusiness: { type: 'boolean' },
        },
      },
      // ── Reusable response wrappers ────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          status: { type: 'integer' },
          details: { type: 'object', nullable: true },
        },
        required: ['error'],
      },
    },
  },
  // ────────────────────────────────────────────────────────────
  // Paths
  // ────────────────────────────────────────────────────────────
  paths: {
    // ═══ Booking ═══════════════════════════════════════════════
    '/book/available-slots': {
      get: {
        tags: ['Booking'],
        summary: 'Get available time slots',
        description: 'Returns available slots for a business on a given date. Public, but returns user-specific booking info if authenticated.',
        parameters: [
          { name: 'businessId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
          { name: 'duration', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Slot duration in minutes' },
        ],
        responses: {
          200: {
            description: 'Slot list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    slots: { type: 'array', items: { $ref: '#/components/schemas/TimeSlot' } },
                    closed: { type: 'boolean' },
                    openTime: { type: 'string' },
                    closeTime: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    message: { type: 'string', nullable: true },
                    userBookings: { type: 'array', items: { $ref: '#/components/schemas/UserBookingSlot' } },
                    crossBusinessBookings: { type: 'array', items: { $ref: '#/components/schemas/UserBookingSlot' } },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/book/create': {
      post: {
        tags: ['Booking'],
        summary: 'Create a booking',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['businessId', 'date', 'startTime', 'clientName'],
                properties: {
                  businessId: { type: 'string', format: 'uuid' },
                  serviceIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Preferred (multi-service)' },
                  serviceId: { type: 'string', format: 'uuid', description: 'Legacy single-service' },
                  date: { type: 'string', format: 'date' },
                  startTime: { type: 'string', description: 'HH:MM' },
                  clientName: { type: 'string', minLength: 2 },
                  clientPhone: { type: 'string', nullable: true },
                  notes: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    appointment: { $ref: '#/components/schemas/Appointment' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Conflict (double-booking or cross-business)' },
        },
      },
    },
    '/bookings': {
      get: {
        tags: ['Booking'],
        summary: 'List user bookings',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            description: 'Bookings with business info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bookings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          service: { type: 'string' },
                          price: { type: 'number', nullable: true },
                          startTime: { type: 'string', format: 'date-time' },
                          endTime: { type: 'string', format: 'date-time' },
                          status: { type: 'string' },
                          businessId: { type: 'string', format: 'uuid' },
                          businessName: { type: 'string' },
                          businessPhone: { type: 'string', nullable: true },
                          businessAddress: { type: 'string', nullable: true },
                          avatarUrl: { type: 'string', nullable: true },
                          accentColor: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Booking'],
        summary: 'Edit a booking (reschedule or change services)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  date: { type: 'string', format: 'date', description: 'Required with startTime for reschedule' },
                  startTime: { type: 'string', description: 'HH:MM' },
                  serviceIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated appointment' },
          409: { description: 'Time slot conflict' },
        },
      },
      delete: {
        tags: ['Booking'],
        summary: 'Cancel a booking',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Cancelled' },
        },
      },
    },

    // ═══ Business Appointments ═════════════════════════════════
    '/business/appointments': {
      get: {
        tags: ['Business Appointments'],
        summary: 'List all appointments for the business',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'object', properties: { appointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } } } } } },
          },
        },
      },
      post: {
        tags: ['Business Appointments'],
        summary: 'Create appointment (business-side)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['client_name', 'service', 'start_time', 'end_time'],
                properties: {
                  client_name: { type: 'string' },
                  client_phone: { type: 'string', nullable: true },
                  client_address: { type: 'string', nullable: true },
                  service: { type: 'string' },
                  price: { type: 'number', nullable: true },
                  start_time: { type: 'string', format: 'date-time' },
                  end_time: { type: 'string', format: 'date-time' },
                  status: { type: 'string', default: 'confirmed' },
                  notes: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
          400: { description: 'Schedule conflict' },
        },
      },
      put: {
        tags: ['Business Appointments'],
        summary: 'Update appointment (business-side)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  client_name: { type: 'string' },
                  client_phone: { type: 'string' },
                  service: { type: 'string' },
                  price: { type: 'number' },
                  start_time: { type: 'string', format: 'date-time' },
                  end_time: { type: 'string', format: 'date-time' },
                  status: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated appointment' },
          409: { description: 'Time conflict' },
        },
      },
      delete: {
        tags: ['Business Appointments'],
        summary: 'Delete appointment',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Deleted' } },
      },
    },

    // ═══ Business Profile ══════════════════════════════════════
    '/business/onboarding': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get onboarding state',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    onboardingCompleted: { type: 'boolean' },
                    businessInfo: { $ref: '#/components/schemas/BusinessInfo' },
                    businessCategory: { type: 'string' },
                    categoryData: { type: 'object' },
                    businessHours: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Business Profile'],
        summary: 'Save onboarding data',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  businessCategory: { type: 'string' },
                  professionalType: { type: 'string' },
                  businessName: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                  serviceMode: { type: 'string' },
                  businessHours: { type: 'array', items: { type: 'object' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Saved' } },
      },
    },
    '/business/details': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get own business details',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: 'Business details with specialty names' } },
      },
      put: {
        tags: ['Business Profile'],
        summary: 'Update business details',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  businessName: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/business/services': {
      get: {
        tags: ['Business Profile'],
        summary: 'List own services',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'object', properties: { services: { type: 'array', items: { $ref: '#/components/schemas/BusinessService' } } } } } },
          },
        },
      },
      post: {
        tags: ['Business Profile'],
        summary: 'Add a service',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'duration_minutes'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  duration_minutes: { type: 'integer' },
                  price: { type: 'number' },
                  currency: { type: 'string', default: 'MAD' },
                  is_active: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
      put: {
        tags: ['Business Profile'],
        summary: 'Update a service',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  duration_minutes: { type: 'integer' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Business Profile'],
        summary: 'Delete a service',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/business/schedule': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get business hours + schedule exceptions',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    businessHours: { type: 'array', items: { type: 'object' } },
                    exceptions: { type: 'array', items: { $ref: '#/components/schemas/ScheduleException' } },
                    category: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Business Profile'],
        summary: 'Update business hours',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { businessHours: { type: 'array' } } } } },
        },
        responses: { 200: { description: 'Updated' } },
      },
      post: {
        tags: ['Business Profile'],
        summary: 'Add schedule exception',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'type', 'date'],
                properties: {
                  title: { type: 'string' },
                  type: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                  isFullDay: { type: 'boolean' },
                  recurring: { type: 'boolean' },
                  recurringDay: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
      delete: {
        tags: ['Business Profile'],
        summary: 'Delete schedule exception',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/business/public-page-settings': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get public page / business card settings',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    settings: { type: 'object' },
                    fallbackBusinessName: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Business Profile'],
        summary: 'Save public page settings',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  settings: {
                    type: 'object',
                    properties: {
                      businessName: { type: 'string' },
                      avatarUrl: { type: 'string' },
                      accentColor: { type: 'string' },
                      showProfile: { type: 'boolean' },
                      showServices: { type: 'boolean' },
                      showPrices: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Saved' } },
      },
    },
    '/business/service-area': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get mobile service area (mobile_service only)',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: 'Service area data' } },
      },
      put: {
        tags: ['Business Profile'],
        summary: 'Update mobile service area',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  baseLocation: { type: 'string' },
                  city: { type: 'string' },
                  serviceRadius: { type: 'number' },
                  citiesCovered: { type: 'array', items: { type: 'string' } },
                  travelFee: { type: 'number' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/business/dashboard-stats': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get dashboard statistics',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todayBookings: { type: 'integer' },
                    weeklyRevenue: { type: 'number' },
                    upcomingBookings: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                    categoryStats: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/business/job-seeker-profile': {
      get: {
        tags: ['Business Profile'],
        summary: 'Get job seeker profile',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: 'Combined user_profile + job_seeker_info' } },
      },
      put: {
        tags: ['Business Profile'],
        summary: 'Update job seeker profile',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  phone: { type: 'string' },
                  city: { type: 'string' },
                  yearsOfExperience: { type: 'integer' },
                  hasCertificate: { type: 'boolean' },
                  preferredCity: { type: 'string' },
                  bio: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/business/applications': {
      get: {
        tags: ['Business Profile'],
        summary: 'List job applications (job seeker)',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: '{ applications: [...] }' } },
      },
    },
    '/business/applications/{id}': {
      patch: {
        tags: ['Business Profile'],
        summary: 'Update application status',
        security: [{ supabaseSession: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['withdrawn'] } } } } },
        },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Business Profile'],
        summary: 'Delete application',
        security: [{ supabaseSession: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/business/specialty': {
      get: {
        tags: ['Business Profile'],
        summary: 'List specialties / categories',
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'string' }, description: 'Filter specialties by category' },
        ],
        responses: { 200: { description: 'Categories or specialties list' } },
      },
    },

    // ═══ Business Discovery ════════════════════════════════════
    '/businesses': {
      get: {
        tags: ['Business Discovery'],
        summary: 'List businesses (grouped by type)',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by business_category' },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    businesses: {
                      type: 'object',
                      description: 'Keyed by professionalType',
                      additionalProperties: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/businesses/favorites': {
      post: {
        tags: ['Business Discovery'],
        summary: 'Get businesses by IDs (for favorites page)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: {
                  ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Businesses list' } },
      },
    },
    '/business-page/{id}': {
      get: {
        tags: ['Business Discovery'],
        summary: 'Get full public business page',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Complete business page data including services, hours, settings, exceptions' } },
      },
    },

    // ═══ User ══════════════════════════════════════════════════
    '/user-profile': {
      get: {
        tags: ['User'],
        summary: 'Get own profile',
        security: [{ supabaseSession: [] }],
        responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } } },
      },
      put: {
        tags: ['User'],
        summary: 'Update own profile',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  birthday: { type: 'string', format: 'date' },
                  gender: { type: 'string' },
                  username: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                  coverImageUrl: { type: 'string' },
                  coverImagePosition: { type: 'number' },
                  profileImageUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/user-profile/{username}': {
      get: {
        tags: ['User'],
        summary: 'Get public profile by username',
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Public profile with optional business info' },
          404: { description: 'User not found' },
        },
      },
    },
    '/check-username': {
      get: {
        tags: ['User'],
        summary: 'Check username availability',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'username', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    available: { type: 'boolean' },
                    self: { type: 'boolean', description: 'Username belongs to the requester' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/get-role': {
      get: {
        tags: ['User'],
        summary: 'Get current user role',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: { type: 'string' },
                    hasRole: { type: 'boolean' },
                    userId: { type: 'string' },
                    email: { type: 'string' },
                    onboardingCompleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/set-role': {
      post: {
        tags: ['User'],
        summary: 'Set user role (user or business)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['user', 'business'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: '{ user }' } },
      },
    },
    '/complete-onboarding': {
      get: {
        tags: ['User'],
        summary: 'Check onboarding status',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: '{ onboarding_completed }' } },
      },
      post: {
        tags: ['User'],
        summary: 'Mark onboarding as complete',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: '{ user }' } },
      },
    },

    // ═══ Verification ══════════════════════════════════════════
    '/business/verification': {
      get: {
        tags: ['Verification'],
        summary: 'Get own verification status',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    verification: { $ref: '#/components/schemas/VerificationRequest' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Verification'],
        summary: 'Upload verification documents',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  identityFile: { type: 'string', format: 'binary' },
                  businessFile: { type: 'string', format: 'binary' },
                  identityDocumentType: { type: 'string' },
                  businessDocumentType: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Upload result' } },
      },
    },

    // ═══ Upload ════════════════════════════════════════════════
    '/upload-image': {
      post: {
        tags: ['Upload'],
        summary: 'Upload image (avatar, cover, gallery, business avatar)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'type'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  type: { type: 'string', enum: ['avatar', 'cover', 'gallery_cover', 'business_avatar'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ url }' },
        },
      },
    },
    '/business/upload-cv': {
      post: {
        tags: ['Upload'],
        summary: 'Upload CV (PDF/DOC/DOCX)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '{ url }' } },
      },
    },

    // ═══ Admin ═════════════════════════════════════════════════
    '/admin/check': {
      get: {
        tags: ['Admin'],
        summary: 'Verify admin access',
        security: [{ supabaseSession: [] }],
        responses: {
          200: { description: '{ isAdmin, adminId }' },
          403: { description: 'Not an admin' },
        },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform statistics',
        security: [{ supabaseSession: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    totalBusiness: { type: 'integer' },
                    pendingVerifications: { type: 'integer' },
                    totalAppointments: { type: 'integer' },
                    suspendedUsers: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users (with filters)',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Users list' } },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update user status (suspend/restrict/activate)',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'account_status'],
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  account_status: { type: 'string', enum: ['active', 'suspended', 'restricted'] },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a user',
        security: [{ supabaseSession: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/admin/verifications': {
      get: {
        tags: ['Admin'],
        summary: 'List pending / all verifications',
        security: [{ supabaseSession: [] }],
        responses: { 200: { description: 'Paginated verifications with user + business info' } },
      },
      put: {
        tags: ['Admin'],
        summary: 'Approve or reject a verification document',
        security: [{ supabaseSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verificationId', 'field', 'action'],
                properties: {
                  verificationId: { type: 'string', format: 'uuid' },
                  field: { type: 'string', enum: ['identity', 'business'] },
                  action: { type: 'string', enum: ['approve', 'reject'] },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Done' } },
      },
    },
    '/admin/businesses': {
      get: {
        tags: ['Admin'],
        summary: 'List all business users',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Businesses list with nested data' } },
      },
    },
    '/admin/businesses/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get single business detail (admin)',
        security: [{ supabaseSession: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'users.id (not business_info.id)' },
        ],
        responses: { 200: { description: 'Full business details + last 50 appointments + exceptions + stats' } },
      },
    },

    // ═══ Utility ═══════════════════════════════════════════════
    '/test-supabase': {
      get: {
        tags: ['Utility'],
        summary: 'Test Supabase connection (debug)',
        responses: { 200: { description: 'Connection test result' } },
      },
    },
  },
};

export default spec;
