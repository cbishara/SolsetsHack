# Official stable Hermes image, pinned to the digest deployed and inspected.
FROM nousresearch/hermes-agent@sha256:9c5561579f3ffdf333401797094ac3a743738d6c25d40f4331c7bf77b694238d
# Keep the upstream entrypoint/s6 supervision and use a persistent gateway,
# rather than the image's default interactive CLI which exits without stdin.
CMD ["gateway", "run"]
