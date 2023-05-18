import { gql } from '@apollo/client';

export const GET_SERVICES = gql`
    query GetServices {
        services {
            id
            name
            icon 
            parameters
            allowedConnections {
                id 
                name
            }
        }
    }
`;

export const GET_BUNDLES = gql`
    query GetBundles {
        bundles {
            id
            label
            icon 
            services {
                id
                name
                icon
                parameters
            }
        }
    }
`;

export const GET_CATEGORIES = gql`
    query categories {
        categories {
            id
            label
            services {
                id
                name
                icon
                parameters
                allowedConnections {
                    id
                }
            }
        }
    }
`;

export const GET_JOB_BY_ID = gql`
    query JobById($id: ID!) {
        jobById(id: $id) {
            id
            name
            username
            institute 
            email
            workflows {
                id
                state
                name
                nodes {
                    service {
                        name
                        icon
                    }
                    formData
                    state
                }
                edges {
                    source {
                        id
                    }
                    target {
                        id
                    }
                }
            }
        }
    }
`;