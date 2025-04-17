# damplab-ui

## About

This tool is being developed for the Design Automation Manufacturing Processes (DAMP) lab to facilitate the submission, management, and tracking of orders for labwork (e.g. DNA assembly/cloning, PCR, fluoresence-bassed assays, transcriptomics/NGS, culturing, etc.)

## Usage

### Website

As of mid 2024, a demo of the website--with a login required--is available at: 

https://damplab.sail.codes/

Connect with a contributor below or a [DAMP Lab](https://www.damplab.org/) representative to see about getting access....

### Running from Source

To run locally for development and real-time updates...

First, you can clone this repo.  (If necessary, you can [install git](https://docs.github.com/en/get-started/getting-started-with-git/set-up-git) and learn more about [cloning a git repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) at the linked instructions.)

Clone the repo with the following command: 

```console
git clone git@github.com:hicsail/damplab-ui.git
cd damplab-ui
```

If necessary, install Node.js and npm (Node Package Manager) (tested on v18.16.0): 

 - [Node.js and npm install instructions](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm)


You can then install the dependencies and launch the program in development mode by running the following from the root folder: 

```console
run npm install --legacy-peer-deps
npm start
```


## Features

In the currently supported use case, a user can construct workflows (sequence of services) on a canvas and submit those workflows as a job.  Technicians can then see the submitted job and choose whether to approve the job or request additional changes.  Technicians (and ultimately clients) can acces a page to the see the details associated with a given job, including the constituent workflows/services/parameters, and the current status of the job.

Ultimately, the tool will have a wide variety of other features, such as a biosecurity screening, eLabs integration, etc. 


### Pages currently available to Clients/Customers (and all users)

 - Canvas (for creating workflows that contain a sequence of connected services/nodes and their associated parameters)
 - Checkout (for submitting a job, which consists of the set of workflows, i.e. sets of conneted nodes, created on the canvas)
 - (Currently Disabled) Client_View (for a detailed list of all workflows and associated services in a job)


 ### Pages currently available to Techs/Admins

 - Dashboard (for showing a list of all submitted jobs, each of which links to the more detailed technician view)
 - Technician_View (for a detailed list of all workflows and associated services in a job)
 - Dominos (for a broad listing of all current workflows, across all jobs, intended for display on a laboratory screen)
 - Elabs and Kernel (simply links to the associated services)


### To Do List

 - Finish Kernel integration and associated sequence formation logic 
 - Email (or other) updates/notifications
 - Proper OAuth for individuals to create personal accounts
 - Branching path workflows/stages (re-implementation)


### Some instructions on setting up auth with Keycloak

First, deploy a Keycloak instance. The exact method will depend on the platform.
[Here](https://www.keycloak.org/getting-started/getting-started-docker) are the Keycloak quickstart docs for Docker.
You will need to set up a realm, register a (public) client, and create user(s).
Be sure to carefully configure appropriate Redirect URIs and Web Origins on the client; since the app must use a public client, this is especially important for security.

The damplab-ui app expects to see certain roles attached to its users.
These are: `damplab-staff`, `internal-customer`, and `external-customer`.
It often makes sense to assign roles to groups and then add users to groups, rather than configuring roles directly on the users.

The damplab-ui app will then need the following environment variables to be set in order to talk to Keycloak:
- `VITE_KEYCLOAK_URL`
- `VITE_KEYCLOAK_REALM`
- `VITE_KEYCLOAK_CLIENT_ID`

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).


## Credit

 - [Asad Malik](https://github.com/am5815)
 - [Chris Krenz](https://github.com/chris-krenz) (primary contact as of mid 2024)
 - [Rishi Shah](https://github.com/ShahRishi)
 - [Greg Frasco](https://github.com/gregfrasco)
 

## License

[MIT License](LICENSE)
