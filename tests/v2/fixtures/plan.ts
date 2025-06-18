import { Plan, Event, Property } from '../../../src/generators/v2/plan/index.js';

const events: Record<string, Event> = {
  identify: {
    eventType: 'identify',
  },
  UserSignedUp: {
    eventType: 'track',
    name: 'User Signed Up',
    description: 'Triggered when a user signs up for the service',
  },
};

const properties: Record<string, Property> = {
  userId: {
    name: 'userId',
    description: 'Unique identifier for the user',
    type: 'string',
  },
  email: {
    name: 'email',
    description: 'Email address of the user',
    type: 'string',
  },
  address: {
    name: 'address',
    description: 'Physical address of the user',
    type: 'object',
  },
  street: {
    name: 'street',
    description: 'Street address of the user',
    type: 'string',
  },
  country: {
    name: 'country',
    description: 'Country of the user',
    type: 'string',
    config: {
      enum: ['USA', 'Greece', 'India'],
    },
  },
  coordinates: {
    name: 'coordinates',
    description: 'Geographical coordinates',
    type: 'object',
  },
  longitude: {
    name: 'longitude',
    description: 'Longitude of the location',
    type: 'number',
  },
  latitude: {
    name: 'latitude',
    description: 'Latitude of the location',
    type: 'number',
  },
  class: {
    name: 'class',
    description: 'A reserved keyword property',
    type: 'string',
  },
  '2ndEmail': {
    name: '2ndEmail',
    description: 'Secondary email starting with number',
    type: 'string',
  },
};

export const example: Plan = {
  name: 'Example Plan',
  rules: [
    {
      event: events.UserSignedUp,
      section: 'properties',
      schema: {
        properties: {
          userId: {
            property: properties.userId,
            required: true,
          },
          email: {
            property: properties.email,
            required: false,
          },
          class: {
            property: properties.class,
            required: false,
          },
          '2ndEmail': {
            property: properties['2ndEmail'],
            required: false,
          },
          address: {
            property: properties.address,
            required: false,
            schema: {
              properties: {
                street: {
                  property: properties.street,
                  required: true,
                },
                country: {
                  property: properties.country,
                  required: true,
                },
                coordinates: {
                  property: properties.coordinates,
                  required: false,
                  schema: {
                    properties: {
                      longitude: {
                        property: properties.longitude,
                        required: true,
                      },
                      latitude: {
                        property: properties.latitude,
                        required: true,
                      },
                    },
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
    {
      event: events.identify,
      section: 'traits',
      schema: {
        properties: {
          userId: {
            property: properties.userId,
            required: true,
          },
          email: {
            property: properties.email,
            required: false,
          },
        },
        additionalProperties: false,
      },
    },
  ],
};
