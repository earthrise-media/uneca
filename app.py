import pandas as pd
import numpy as np
import altair as alt
import streamlit as st
import geopandas as gpd
import matplotlib.pyplot as plt
import datetime
from statsmodels.tsa.stattools import adfuller
import pydeck as pdk
import plotly.graph_objects as go
import plotly.express as px
import json


st.header("test")


st.markdown("""

> Test

""")

@st.cache()
def load_data():

    with open('data/subnational.geojson') as json_file:
        geodata = json.load(json_file)

    # subnational = gpd.read_file('data/subnational.geojson')

    return geodata


geodata = load_data()

st.write(geodata)


