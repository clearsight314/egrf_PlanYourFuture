import networkx as nx
import matplotlib.pyplot as plt
import pandas
import ast
import json

overall_reqs = pandas.read_csv("major_classes.csv")

prerequisites = pandas.read_csv("CS_Reqs.csv")

cs_reqs = overall_reqs.loc[overall_reqs['Program'] == 'Computer Science (BS)']
print(cs_reqs)

graph = nx.DiGraph()
counter = 0

raw = cs_reqs['Classes'].values[0]  # get the single cell value
course_list = ast.literal_eval(raw)  # parse string into a real list

for course in course_list:
    if isinstance(course, list):
        # a group of equivalent courses, so pick last one
        if course:
            graph.add_node(course[-1])
    elif isinstance(course, str) and course:
        graph.add_node(course)

for course in list(graph.nodes):
    result = prerequisites.loc[prerequisites['Course'] == course]
    
    if result.empty:
        continue  # no prerequisites for this course
    
    prereq_str = result['Prerequisites'].values[0]

    if isinstance(prereq_str, float):  # NaN check
        continue
    
    # Handle AND conditions
    and_parts = prereq_str.split(' AND ')
    
    for part in and_parts:
        # Handle OR conditions
        or_options = [p.strip() for p in part.split(' OR ')]
        
        # Check if any OR option is already in the graph
        match = next((p for p in or_options if p in graph.nodes), None)
        
        if match:
            graph.add_edge(match, course)  # prereq → course
        else:
            # None are in the graph, add the last one
            new_node = or_options[-1]
            graph.add_node(new_node)
            graph.add_edge(new_node, course)


# Assign each node a layer based on its depth in the graph
for node in nx.topological_sort(graph): # networkx can do this
    predecessors = list(graph.predecessors(node))
    if not predecessors:
        graph.nodes[node]['layer'] = 0
    else:
        graph.nodes[node]['layer'] = max(graph.nodes[p]['layer'] for p in predecessors) + 1

# Export the file as json
pos = nx.multipartite_layout(graph, subset_key='layer', align='horizontal')

nodes_export = []
for node in graph.nodes:
    x, y = pos[node]
    nodes_export.append({
        "id": str(node),
        "layer": graph.nodes[node].get('layer', 0),
        "x": float(-x),
        "y": float(-y)
    })
    
links_export = [{"source": str(u), "target": str(v)} for u, v in graph.edges]

with open("cs_course_graph.json", "w") as f:
    json.dump({"nodes": nodes_export, "links": links_export}, f, indent=4)
    
print("Export graph as cs_course_graph.json")

plt.figure(figsize=(12, 8))
pos = nx.multipartite_layout(graph, subset_key='layer', align='horizontal')
pos = {node: (-x, -y) for node, (x, y) in pos.items()}
nx.draw(graph, pos, with_labels=True,
        node_color='lightblue',
        node_size=1000,
        font_size=5,
        arrows=True)
plt.show()