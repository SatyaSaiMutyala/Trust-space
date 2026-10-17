import React from 'react';
import { View } from 'react-native';
import { colors, vs } from '../theme';
export default function Divider({ style, color = colors.lineSoft, space = 0 }) { return <View style={[{ height: 1, backgroundColor: color, marginVertical: vs(space) }, style]} />; }
