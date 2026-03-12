def logical_to_physical(x, y, scale):
    return (round(x * scale), round(y * scale))


def physical_to_logical(x, y, scale):
    return (round(x / scale), round(y / scale))
