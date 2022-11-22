FROM python:3.11 AS build-stage

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ARG USERNAME=prostars
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG WORKING_DIR=/workspaces/prostars


RUN pip install -U pip && pip install pipenv && \
    # create new user
    groupadd --gid $USER_GID $USERNAME && \
    useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    # [Optional] Uncomment the next three lines to add sudo support
    # apt-get install -y sudo && \
    # echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && \
    # chmod 0440 /etc/sudoers.d/$USERNAME && \
    # make working directory and change owner
    mkdir -p ${WORKING_DIR}/ && \
    chown $USER_UID:$USER_GID ${WORKING_DIR}/

# Change to the newly created user
USER $USER_UID:$USER_GID
COPY --chown=${USER_UID}:${USER_GID} Pipfile* $WORKING_DIR/

WORKDIR $WORKING_DIR
RUN pipenv install --deploy --ignore-pipfile


# dev stage steps below
FROM build-stage as dev-stage
ARG USER_UID=1000
ARG USER_GID=$USER_UID

COPY --chown=${USER_UID}:${USER_GID} . $WORKING_DIR/
RUN pipenv sync --dev

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=

CMD ["/bin/bash"]


# prod stage steps below. Similiar as the dev stage, but we copy the venv from
# the build stage to the prod stage (no git in slim version of this docker base image)
FROM python:3.11-slim AS prod-stage
# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ARG USERNAME=prostars
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG WORKING_DIR=/workspaces/prostars

RUN pip install -U pip && pip install pipenv && \
    # create new user
    groupadd --gid $USER_GID $USERNAME && \
    useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    # [Optional] Uncomment the next three lines to add sudo support
    # apt-get install -y sudo && \
    # echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && \
    # chmod 0440 /etc/sudoers.d/$USERNAME && \
    # make working directory and change owner
    mkdir -p $WORKING_DIR/ && \
    chown $USER_UID:$USER_GID $WORKING_DIR/

# Change to the newly created user
USER $USER_UID:$USER_GID
COPY --chown=${USER_UID}:${USER_GID} . $WORKING_DIR/
# here we copy the venv from the dev stage to the prod stage
COPY --from=build-stage /home/${USERNAME}/.local/share /home/${USERNAME}/.local/share

WORKDIR $WORKING_DIR

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=

CMD exec pipenv run gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 prostars.wsgi:app