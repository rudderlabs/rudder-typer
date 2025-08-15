import { Plan, Event, Property, CustomType } from '../../../src/generators/v2/plan/index.js';

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

const customTypes: Record<string, CustomType> = {};
customTypes.Coordinates = {
  name: 'Coordinates',
  description: 'Geographical coordinates',
  schema: {
    properties: {
      longitude: {
        property: {
          name: 'longitude',
          description: 'Longitude of the location',
          type: 'number',
        },
        required: true,
      },
      latitude: {
        property: {
          name: 'latitude',
          description: 'Latitude of the location',
          type: 'number',
        },
        required: true,
      },
    },
    additionalProperties: false,
  },
};

// Create a custom type for the address
customTypes.Address = {
  name: 'Address',
  description: 'Physical address details',
  schema: {
    properties: {
      street: {
        property: {
          name: 'street',
          description: 'Street address of the user',
          type: 'string',
        },
        required: true,
      },
      country: {
        property: {
          name: 'country',
          description: 'Country of the user',
          type: 'string',
          config: {
            enum: ['USA', 'Greece', 'India'],
          },
        },
        required: true,
      },
      coordinates: {
        property: {
          name: 'coordinates',
          description: 'Geographical coordinates',
          type: customTypes.Coordinates,
        },
        required: false,
      },
    },
    additionalProperties: false,
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
    type: customTypes.Address,
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
  nested: {
    name: 'nested',
    description: 'A nested property',
    type: 'object',
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
            required: true,
          },
          nested: {
            property: properties.nested,
            required: false,
            schema: {
              properties: {
                userId: {
                  property: properties.userId,
                  required: true,
                },
              },
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
          address: {
            property: properties.address,
            required: false,
          },
        },
        additionalProperties: false,
      },
    },
  ],
};
