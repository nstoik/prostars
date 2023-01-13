# Prostars Website

## Docker

There is a devcontainer setup for VSCode. This will allow you to run the website locally in a container and build on it.

There is a dev-stage of the dockerfile that can be used to build and test the container locally. To build it run:

```bash
docker build --tag nstoik/prostars:dev --target dev-stage .
```

There is a prod-stage of the dockerfile that can be used to build the container for production. To build it run:

```bash
docker build --tag nstoik/prostars:latest --target prod-stage .
```

To push the container to Docker Hub run:

```bash
docker push nstoik/prostars:latest
```

## GCloud

GCloud deployment is done using the `gcloud` command line tool. You can install it by following the instructions [here](https://cloud.google.com/sdk/docs/install-sdk#deb).

# Regions
In order to use the custom domain features of GCloud Cloud Run, there is a select option of regions that can be used. See [this list](https://cloud.google.com/run/docs/mapping-custom-domains#limitations) for the available regions.

I am using the 'us-west1' region.

## Deploying
To deploy the container to GCloud run:

```bash
gcloud run deploy prostars --source . --allow-unauthenticated --region us-west1
```