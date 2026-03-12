import json
import sys

import click


def output(data):
    click.echo(json.dumps(data, indent=2))


def error(message, code=1):
    click.echo(json.dumps({"error": message}), err=True)
    sys.exit(code)
