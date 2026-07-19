from fastapi import Request
from sqlalchemy.engine import Engine


def get_engine(request: Request) -> Engine:
    return request.app.state.engine
