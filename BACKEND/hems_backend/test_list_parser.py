from pydantic import BaseModel, Field
from typing import List

class DeviceData(BaseModel):
    building: str
    room: str
    device_type: str

class DeviceList(BaseModel):
    devices: List[DeviceData]

from langchain_core.output_parsers import PydanticOutputParser
parser = PydanticOutputParser(pydantic_object=DeviceList)
print(parser.get_format_instructions())
