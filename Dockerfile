FROM python:3.14 AS build-stage

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ARG USERNAME=prostars
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG WORKING_DIR=/workspaces/prostars

RUN pip install -U pip uv && \
    groupadd --gid $USER_GID $USERNAME && \
    useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    mkdir -p ${WORKING_DIR}/ && \
    chown $USER_UID:$USER_GID ${WORKING_DIR}/

USER $USER_UID:$USER_GID
COPY --chown=${USER_UID}:${USER_GID} pyproject.toml ${WORKING_DIR}/
WORKDIR ${WORKING_DIR}
RUN uv sync --no-dev --no-install-project


# prod stage — slim image, venv copied from build stage
FROM python:3.14-slim AS prod-stage
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ARG USERNAME=prostars
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG WORKING_DIR=/workspaces/prostars

RUN groupadd --gid $USER_GID $USERNAME && \
    useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    mkdir -p ${WORKING_DIR}/ && \
    chown $USER_UID:$USER_GID ${WORKING_DIR}/

USER $USER_UID:$USER_GID
COPY --chown=${USER_UID}:${USER_GID} . ${WORKING_DIR}/
COPY --from=build-stage --chown=${USER_UID}:${USER_GID} ${WORKING_DIR}/.venv ${WORKING_DIR}/.venv

WORKDIR ${WORKING_DIR}
ENV DEBIAN_FRONTEND=
ENV PORT=8080
ENV PYTHONPATH=${WORKING_DIR}
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD .venv/bin/python -c "import urllib.request, os; urllib.request.urlopen('http://localhost:' + os.environ.get('PORT', '8080') + '/')" || exit 1

CMD exec .venv/bin/gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 prostars.wsgi:app
