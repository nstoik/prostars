FROM python:3.13 AS dev-stage

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ARG USERNAME=prostars
ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG WORKING_DIR=/workspaces/prostars

RUN apt-get update && \
    apt-get -yqq install --no-install-recommends apt-utils dialog apt-transport-https locales 2>&1 && \
    apt-get -yqq install git procps lsb-release && \
    apt-get autoremove -y && \
    apt-get clean -y && \
    rm -rf /var/lib/apt/lists/*

RUN pip install -U pip uv && \
    groupadd --gid $USER_GID $USERNAME && \
    useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME && \
    mkdir -p $WORKING_DIR/ && \
    chown $USER_UID:$USER_GID $WORKING_DIR/

# Persist bash history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && echo $SNIPPET >> "/root/.bashrc" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R $USERNAME /commandhistory \
    && echo $SNIPPET >> "/home/$USERNAME/.bashrc"

USER $USER_UID:$USER_GID
COPY --chown=${USER_UID}:${USER_GID} . $WORKING_DIR/
WORKDIR $WORKING_DIR

ENV DEBIAN_FRONTEND=

CMD ["/bin/bash"]
