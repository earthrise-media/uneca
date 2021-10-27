import pandas as pd
import numpy as np
import altair as alt
import streamlit as st


st.header("Continental Carbon Sequestration")


st.markdown("""

> This simple web app is an **intermediate product**.  It is not the final
  tool.  Rather, it is meant to settle on the features of a final tool before
  it goes to the web developers for the final build, which will look more
  [like this](https://justice40.earthrise.media/).

The **purpose** of the country level map is to allow users to quickly assess
country level potential, revenue, and jobs across different solutions and
carbon price points.  

**Questions**:

1. How much will the rankings vary with Carbon price?
2. Is it more important to compare one country to *all* others, or just *one* other?
3. More generally, what is operational question (which will inform the guided data exploration)?

""")

@st.cache()
def load_data():

    countries = alt.topo_feature(
        "https://nlambert.gitpages.huma-num.fr/resources/basemaps/world_countries.topojson",
        "world_countries_data",
    )

    sequestration = pd.read_pickle("data/sequestration.pkl")
    totals = pd.read_pickle("data/totals.pkl")
    return countries, sequestration, totals


countries, sequestration, totals = load_data()


varnames = [
  "reforestation", 
  "avoided_forest_conversion", 
  "natural_forest_management", 
  "avoided_woodfuel_harvest", 
  "savanna_burning", 
  "biochar",
  "trees_in_agricultural_lands",
  "nutrient_management",
  "rice_management",
  "optimal_grazing_intensity",
  "grazing_legumes",
  "peatland_restoration",
  "avoided_peat_impacts",
  "avoided_mangrove_impacts",
  "mangrove_restoration",
  "avoided_grassland_conversion"
]

benefit_type = st.sidebar.selectbox(
    "Type of benefit",
    [
        "Sequestration",
        "Sequestration/ha",
        "Revenues",
        "Revenues/GDP",
        "Jobs",
        "Jobs/(1000ppl)"
    ]
)

pathway = st.sidebar.selectbox(
    "Pathway",
    varnames
)


dollar_price = st.select_slider(
    "Price per tCO2e",
    options=[10, 30, 50, 70, 100]
)

df = sequestration[sequestration.price==dollar_price]


africa_chart = (
    alt.Chart(countries, height=600)
    .mark_geoshape(strokeWidth=0)
    .encode(
        color=alt.Color(
            f"{pathway}:Q", 
            legend=alt.Legend(orient="bottom-left")
        ),
        tooltip=[
            alt.Tooltip("properties.NAMEen:O", title="Country"),
            alt.Tooltip(f"{pathway}:Q", title="Indicator value"),
        ]
    )
    .transform_lookup(
        lookup="properties.ISO3",
        from_=alt.LookupData(df, "iso3", [pathway]),
    ).configure_view(
      strokeWidth=0
    )
)
st.altair_chart(africa_chart, use_container_width=True)


barchart = alt.Chart(df[df[pathway] > 0]).mark_bar().encode(
    x=alt.X(f'sum({pathway}):Q', title=pathway),
    y=alt.Y('geoname:N', sort='-x', title=None)
)

st.altair_chart(barchart, use_container_width=True)

