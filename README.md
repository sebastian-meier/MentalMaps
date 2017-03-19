# MentalMaps
Creating mental maps from georeferenced activity data

## 00 - Concept

### Psychogeography in the age of the quantified self
#### Mental map modelling with georeferenced personal activity data

Subjective perceptions of urban space have been in the focus of various research projects and act as a recurring reference in artistic practice, not least since the French Situationist International coined the term »psychogeography« in the 1950s as "the study of the specific effects of the geographical environment (whether consciously organized or not) on the emotions and behavior of individuals" (Debord, 1955). The main premise of this definition remains relevant even today, since each of us perceive their environment in a personal and different way, depending on past experiences and how we make use of urban spaces. Adding to this, practices of self-tracking in the age of the quantified self have created another layer of spatial perception in the form of personal movement data and device-aided orientation. Through this artwork, we subject a data-driven representation of urban geography to an artistic and aesthetic interpretation. With this, we do not claim to provide a seemingly objective embodiment of allegedly quantifiable experiences of the self. Quite the contrary, we emphasize the oscillation between supposedly quantitative, objective data and subjective, sensual experiences of space. Based on the assumption that our memory of the urban infrastructure is among other things strongly influenced by how we navigate the world (e.g. mode of transportation), we built an algorithm that aggregates personal activity data (GPS trajectories) and creates an individual city model based upon a series of movement analysis. Thus, the resulting visual and physical model represent a personal perspective on the city. These individual representations generated by the algorithm can be perceived as discursive artefacts, which can help to better understand and reflect subjective views and experiences of the urban infrastructure.



More images on our project page: http://www.vislab.io/projects/mentalmaps/

## 01 - Activity Data from the Moves App

The app is using activity data from the Moves App (https://www.moves-app.com/)
The company offers an easy way to download a user's entire activity history as a JSON file (or several JSON files).

## 02 - Parsing & Clustering

We apply several analysis steps in order to cluster the data. The main part is to identify central areas of a user's activity. Afterwards a network is created connecting those central areas. The vis folder contains several methods for visualizing the resulting data.

As a canvas, for plotting our potential memorization index, we use buildings or rather building-blocks. We used data from Berlin's FIS-Broker (re_blocks). But alternatively you could simply download building data from OSM using Overpass (http://overpass.osm.rambler.ru/cgi/interpreter?data=[out:json][timeout:25];(way[%22building%22](52.48079061689648,13.431268930435179,52.484142510672946,13.437373638153076);relation[%22building%22](52.48079061689648,13.431268930435179,52.484142510672946,13.437373638153076););out%20body;%3E;out%20skel%20qt;).

## 03 - TODO

We are working on further documenting the process and making the overall workflow easier.